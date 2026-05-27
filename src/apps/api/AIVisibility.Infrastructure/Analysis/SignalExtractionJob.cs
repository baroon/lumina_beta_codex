using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Skeleton implementation (Slice 1). Sets Status=Running + ExtractStartedAt
/// on entry; sets ExtractCompletedAt on exit. Does no actual extraction yet —
/// Slice 2 adds the per-answer LLM call inside.
///
/// Retry policy per D3: 3 attempts with exp backoff. Hangfire's
/// [AutomaticRetry] handles the retry; on terminal failure (after retries)
/// Slice 2 will add try/catch to mark Status=Failed + ErrorMessage. Skipping
/// that here because the skeleton can't realistically throw.
/// </summary>
public class SignalExtractionJob : ISignalExtractionJob
{
    private readonly IAppDbContext _db;
    private readonly ILogger<SignalExtractionJob> _logger;

    public SignalExtractionJob(IAppDbContext db, ILogger<SignalExtractionJob> logger)
    {
        _db = db;
        _logger = logger;
    }

    // Hangfire reads this attribute on the actual invoked method.
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 240, 960 })]
    public async Task ExtractAsync(Guid analysisJobId, CancellationToken cancellationToken)
    {
        var job = await _db.AnalysisJobs.FirstOrDefaultAsync(j => j.Id == analysisJobId, cancellationToken)
            ?? throw new InvalidOperationException($"AnalysisJob {analysisJobId} not found.");

        // Set Running on every attempt (idempotent across Hangfire retries).
        job.Status = AnalysisJobStatus.Running;
        job.ExtractStartedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        // TODO Slice 2: per-answer LLM extraction (signal + mentions + citations + candidates).
        _logger.LogInformation(
            "SignalExtractionJob skeleton ran for AnalysisJob {AnalysisJobId} (no real extraction yet — see Slice 2).",
            analysisJobId);

        job.ExtractCompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
