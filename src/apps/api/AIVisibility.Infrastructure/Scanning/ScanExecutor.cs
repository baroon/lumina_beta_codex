using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Scanning;

public class ScanExecutor : IScanExecutor
{
    private readonly IAppDbContext _db;
    private readonly IScanProvider _provider;
    private readonly IBackgroundJobClient _jobs;
    private readonly SignalExtractor _extractor;
    private readonly IAnswerSignalWriter _writer;
    private readonly ISignalExtractionContextFactory _contextFactory;
    private readonly ILogger<ScanExecutor> _logger;

    public ScanExecutor(
        IAppDbContext db,
        IScanProvider provider,
        IBackgroundJobClient jobs,
        SignalExtractor extractor,
        IAnswerSignalWriter writer,
        ISignalExtractionContextFactory contextFactory,
        ILogger<ScanExecutor> logger)
    {
        _db = db;
        _provider = provider;
        _jobs = jobs;
        _extractor = extractor;
        _writer = writer;
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

        var completed = 0;
        var failed = 0;
        foreach (var pr in promptRuns)
        {
            pr.Status = PromptRunStatus.Running;
            pr.StartedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            var text = promptText.GetValueOrDefault(pr.PromptId, string.Empty);
            var code = platformCode.GetValueOrDefault(pr.AIPlatformId, string.Empty);
            AIAnswer? savedAnswer = null;
            try
            {
                var answer = await _provider.GetAnswerAsync(code, text, cancellationToken);
                if (answer.Success)
                {
                    savedAnswer = new AIAnswer
                    {
                        Id = Guid.NewGuid(),
                        PromptRunId = pr.Id,
                        AnswerText = answer.Text,
                        RawResponse = answer.RawResponse,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _db.AIAnswers.Add(savedAnswer);
                    pr.Status = PromptRunStatus.Completed;
                    completed++;
                }
                else
                {
                    pr.Status = PromptRunStatus.Failed;
                    pr.ErrorMessage = answer.Error;
                    failed++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Scan check {PromptRunId} failed", pr.Id);
                pr.Status = PromptRunStatus.Failed;
                pr.ErrorMessage = ex.Message;
                failed++;
            }

            pr.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            // Per-answer extraction. Runs inline so the live counters on the
            // scan-progress screen tick up as the scan progresses. Per-answer
            // failures are isolated (D3) — one bad extraction doesn't fail
            // the whole scan or stop subsequent prompt-runs.
            if (savedAnswer is not null)
            {
                try
                {
                    var result = await _extractor.ExtractAsync(savedAnswer, context, cancellationToken);
                    if (result is not null)
                    {
                        await _writer.WriteAsync(result, context, cancellationToken);
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex,
                        "Per-answer extraction threw for AIAnswer {AIAnswerId}; continuing.",
                        savedAnswer.Id);
                }
            }
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
}
