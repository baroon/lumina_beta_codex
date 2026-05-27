using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Runs per-answer LLM extraction for every <see cref="AIAnswer"/> in a scan
/// (Phase 3 plan §4 step 2). Bounded parallel via <c>SemaphoreSlim</c> (D21).
/// Per-answer failures are logged and skipped — one bad answer doesn't fail
/// the scan (D3). Hangfire's <see cref="AutomaticRetryAttribute"/> retries the
/// whole job 3× on terminal failure; the catch block records
/// <see cref="AnalysisJobStatus.Failed"/> + error message after retries exhaust.
/// </summary>
public class SignalExtractionJob : ISignalExtractionJob
{
    private readonly IAppDbContext _db;
    private readonly SignalExtractor _extractor;
    private readonly AnalysisOptions _options;
    private readonly ILogger<SignalExtractionJob> _logger;

    public SignalExtractionJob(
        IAppDbContext db,
        SignalExtractor extractor,
        IOptions<AnalysisOptions> options,
        ILogger<SignalExtractionJob> logger)
    {
        _db = db;
        _extractor = extractor;
        _options = options.Value;
        _logger = logger;
    }

    // [AutomaticRetry] lives on the interface (ISignalExtractionJob) because
    // ScanExecutor enqueues via interface type and Hangfire reads filter
    // attributes from the serialized job target. See ISignalExtractionJob.
    public async Task ExtractAsync(Guid analysisJobId, CancellationToken cancellationToken)
    {
        var job = await _db.AnalysisJobs.FirstOrDefaultAsync(j => j.Id == analysisJobId, cancellationToken)
            ?? throw new InvalidOperationException($"AnalysisJob {analysisJobId} not found.");

        job.Status = AnalysisJobStatus.Running;
        job.ExtractStartedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            var context = await BuildContextAsync(job.ScanRunId, cancellationToken);
            var answers = await LoadAnswersAsync(job.ScanRunId, cancellationToken);

            if (answers.Count == 0)
            {
                _logger.LogInformation(
                    "AnalysisJob {AnalysisJobId} has no answers to extract (scan {ScanRunId}).",
                    analysisJobId, job.ScanRunId);
            }
            else
            {
                var results = await ExtractAllAsync(answers, context, cancellationToken);
                PersistResults(results);
                await _db.SaveChangesAsync(cancellationToken);
            }

            job.ExtractCompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Job-level failure (DB / context build / scan-wide problem). Hangfire's
            // [AutomaticRetry] re-runs the whole job up to its attempt budget; once
            // exhausted, the final attempt records Failed status for reporting (D3).
            _logger.LogError(ex,
                "SignalExtractionJob threw for AnalysisJob {AnalysisJobId}", analysisJobId);
            job.Status = AnalysisJobStatus.Failed;
            job.ErrorMessage = $"{ex.GetType().Name}: {ex.Message}";
            await _db.SaveChangesAsync(CancellationToken.None);
            throw;
        }
    }

    private async Task<SignalExtractionContext> BuildContextAsync(Guid scanRunId, CancellationToken ct)
    {
        var scan = await _db.ScanRuns
            .Include(s => s.TrackerConfiguration)
            .ThenInclude(t => t.Brand)
            .FirstAsync(s => s.Id == scanRunId, ct);

        var tracker = scan.TrackerConfiguration;
        var brand = tracker.Brand;

        var competitorIds = await _db.TrackerCompetitors
            .Where(tc => tc.TrackerConfigurationId == tracker.Id)
            .Select(tc => tc.CompetitorId)
            .ToListAsync(ct);
        var competitors = await _db.Competitors
            .Where(c => competitorIds.Contains(c.Id))
            .ToListAsync(ct);

        var productIds = await _db.TrackerProducts
            .Where(tp => tp.TrackerConfigurationId == tracker.Id)
            .Select(tp => tp.ProductId)
            .ToListAsync(ct);
        var products = await _db.Products
            .Where(p => productIds.Contains(p.Id))
            .ToListAsync(ct);

        return new SignalExtractionContext(brand, competitors, products);
    }

    private async Task<List<AIAnswer>> LoadAnswersAsync(Guid scanRunId, CancellationToken ct)
    {
        var promptRunIds = await _db.PromptRuns
            .Where(pr => pr.ScanRunId == scanRunId)
            .Select(pr => pr.Id)
            .ToListAsync(ct);
        return await _db.AIAnswers
            .Where(a => promptRunIds.Contains(a.PromptRunId))
            .ToListAsync(ct);
    }

    private async Task<List<SignalExtractionResult>> ExtractAllAsync(
        List<AIAnswer> answers, SignalExtractionContext context, CancellationToken ct)
    {
        var concurrency = Math.Max(1, _options.ExtractionConcurrency);
        using var gate = new SemaphoreSlim(concurrency);
        var results = new List<SignalExtractionResult>(answers.Count);
        var resultsLock = new object();

        var tasks = answers.Select(async answer =>
        {
            await gate.WaitAsync(ct);
            try
            {
                // Catch-and-continue per D3 — one bad answer must not fail the scan.
                var result = await _extractor.ExtractAsync(answer, context, ct);
                if (result is null) return;
                lock (resultsLock)
                {
                    results.Add(result);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex,
                    "Per-answer extraction threw for AIAnswer {AIAnswerId}; continuing.",
                    answer.Id);
            }
            finally
            {
                gate.Release();
            }
        });

        await Task.WhenAll(tasks);
        return results;
    }

    private void PersistResults(IEnumerable<SignalExtractionResult> results)
    {
        foreach (var r in results)
        {
            _db.AnswerSignals.Add(r.Signal);
            foreach (var m in r.Mentions) _db.Mentions.Add(m);
            foreach (var c in r.Candidates) _db.MentionCandidates.Add(c);
            foreach (var c in r.Citations) _db.Citations.Add(c);
        }
    }
}
