using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Scanning;

public class ScanExecutor : IScanExecutor
{
    private readonly IAppDbContext _db;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IScanProvider _provider;
    private readonly IBackgroundJobClient _jobs;
    private readonly SignalExtractor _extractor;
    private readonly ISignalExtractionContextFactory _contextFactory;
    private readonly ILogger<ScanExecutor> _logger;

    public ScanExecutor(
        IAppDbContext db,
        IServiceScopeFactory scopeFactory,
        IScanProvider provider,
        IBackgroundJobClient jobs,
        SignalExtractor extractor,
        ISignalExtractionContextFactory contextFactory,
        ILogger<ScanExecutor> logger)
    {
        _db = db;
        _scopeFactory = scopeFactory;
        _provider = provider;
        _jobs = jobs;
        _extractor = extractor;
        _contextFactory = contextFactory;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid scanRunId, CancellationToken cancellationToken = default)
    {
        var run = await _db.ScanRuns.FirstOrDefaultAsync(r => r.Id == scanRunId, cancellationToken);
        if (run == null) return;

        run.Status = ScanRunStatus.Running;
        await _db.SaveChangesAsync(cancellationToken);

        // Build the signal-extraction context once for the whole scan so
        // every per-answer extraction call shares the same tracked entity
        // lookup. Cheaper than re-querying per answer; the tracked universe
        // doesn't change during a scan.
        var context = await _contextFactory.BuildAsync(scanRunId, cancellationToken);

        var promptRuns = await _db.PromptRuns
            .Where(p => p.ScanRunId == scanRunId && p.Status == PromptRunStatus.Pending)
            .ToListAsync(cancellationToken);

        var promptText = await _db.Prompts
            .Where(p => promptRuns.Select(r => r.PromptId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.PromptText, cancellationToken);
        var platformCode = await _db.AIPlatforms
            .Where(p => promptRuns.Select(r => r.AIPlatformId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Code, cancellationToken);

        // Lever 1 from docs/07-deferred-future-work.md: parallel across
        // platforms within each prompt. Each provider has its own rate-limit
        // bucket so fanning the platform iterations out compounds no risk.
        // We wait between prompts so we never run more than N=platforms
        // concurrent calls at once — that's Lever 3 territory and needs a
        // per-provider RPM bucket.
        var byPrompt = promptRuns.GroupBy(p => p.PromptId).ToList();

        // SemaphoreSlim serializes the writer's Source dedup section so two
        // concurrent platform tasks within a scan can't race to insert the
        // same canonical Source row (e.g. both answers cite wikipedia.org —
        // the writer queries-then-adds, which races without this lock). The
        // LLM calls (the slow part) stay parallel; only the ~50ms writer
        // call serializes.
        using var writerLock = new SemaphoreSlim(1, 1);
        var completed = 0;
        var failed = 0;

        foreach (var group in byPrompt)
        {
            var text = promptText.GetValueOrDefault(group.Key, string.Empty);
            var tasks = group.Select(pr => ExecuteOneAsync(
                pr.Id,
                text,
                platformCode.GetValueOrDefault(pr.AIPlatformId, string.Empty),
                context,
                writerLock,
                cancellationToken)).ToList();
            var results = await Task.WhenAll(tasks);
            completed += results.Count(r => r);
            failed += results.Count(r => !r);
        }

        run.CompletedCount = completed;
        run.FailedCount = failed;
        run.Status = ScanRunStatus.Completed;
        run.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        // Phase 3 analysis handoff: extraction now happens inline above, so
        // the AnalysisJob audit row lands already-complete on the extract
        // side. We still enqueue MetricAggregationJob for the scan-wide
        // rollups (Phase 4 metric_name aggregates) which can only run once
        // every per-answer extraction has landed.
        var analysisJob = new AnalysisJob
        {
            Id = Guid.NewGuid(),
            ScanRunId = run.Id,
            Status = AnalysisJobStatus.Running,
            CreatedAt = DateTime.UtcNow,
            ExtractStartedAt = run.StartedAt,
            ExtractCompletedAt = DateTime.UtcNow,
        };
        _db.AnalysisJobs.Add(analysisJob);
        await _db.SaveChangesAsync(cancellationToken);

        _jobs.Enqueue<IMetricAggregationJob>(
            j => j.AggregateAsync(analysisJob.Id, CancellationToken.None));
    }

    /// <summary>
    /// One (prompt, platform) iteration in its own DI scope so the DbContext
    /// + writer don't collide with concurrent siblings. Returns true on
    /// success (answer saved + extraction attempted), false on failure.
    /// Per-answer extraction failures (D3) stay isolated — they log + skip
    /// the writer rather than propagate.
    /// </summary>
    private async Task<bool> ExecuteOneAsync(
        Guid promptRunId,
        string promptText,
        string platformCode,
        SignalExtractionContext context,
        SemaphoreSlim writerLock,
        CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var scopedDb = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var scopedWriter = scope.ServiceProvider.GetRequiredService<IAnswerSignalWriter>();

        var pr = await scopedDb.PromptRuns.FirstOrDefaultAsync(p => p.Id == promptRunId, ct);
        if (pr == null) return false;
        pr.Status = PromptRunStatus.Running;
        pr.StartedAt = DateTime.UtcNow;
        await scopedDb.SaveChangesAsync(ct);

        AIAnswer? savedAnswer = null;
        var success = false;
        try
        {
            var answer = await _provider.GetAnswerAsync(platformCode, promptText, ct);
            if (answer.Success)
            {
                savedAnswer = new AIAnswer
                {
                    Id = Guid.NewGuid(),
                    PromptRunId = pr.Id,
                    AnswerText = answer.Text,
                    RawResponse = answer.RawResponse ?? string.Empty,
                    CreatedAt = DateTime.UtcNow,
                };
                scopedDb.AIAnswers.Add(savedAnswer);
                pr.Status = PromptRunStatus.Completed;
                success = true;
            }
            else
            {
                pr.Status = PromptRunStatus.Failed;
                pr.ErrorMessage = answer.Error;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Scan check {PromptRunId} failed", pr.Id);
            pr.Status = PromptRunStatus.Failed;
            pr.ErrorMessage = ex.Message;
        }

        pr.CompletedAt = DateTime.UtcNow;
        await scopedDb.SaveChangesAsync(ct);

        if (savedAnswer is not null)
        {
            try
            {
                var result = await _extractor.ExtractAsync(savedAnswer, context, ct);
                if (result is not null)
                {
                    // Serialize the writer per scan so source dedup is race-free.
                    // Cheap (~50ms per call); no measurable impact on the parallel
                    // speedup that comes from concurrent LLM calls.
                    await writerLock.WaitAsync(ct);
                    try
                    {
                        await scopedWriter.WriteAsync(result, context, ct);
                    }
                    finally
                    {
                        writerLock.Release();
                    }
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex,
                    "Per-answer extraction threw for AIAnswer {AIAnswerId}; continuing.",
                    savedAnswer.Id);
            }
        }
        return success;
    }
}
