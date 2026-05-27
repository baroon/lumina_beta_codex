using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Skeleton implementation (Slice 1). Sets AggregateStartedAt on entry,
/// AggregateCompletedAt + Status=Completed on exit. Does no actual
/// aggregation yet — Slice 4 adds the ScanMetric computation inside.
///
/// Retry policy per D3: 1 attempt (aggregate is deterministic SQL; if it
/// fails twice, the issue is code/data, not transient). Same Slice 2+
/// note as SignalExtractionJob: skipping try/catch for Status=Failed here
/// because the skeleton can't realistically throw.
/// </summary>
public class MetricAggregationJob : IMetricAggregationJob
{
    private readonly IAppDbContext _db;
    private readonly ILogger<MetricAggregationJob> _logger;

    public MetricAggregationJob(IAppDbContext db, ILogger<MetricAggregationJob> logger)
    {
        _db = db;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 1)]
    public async Task AggregateAsync(Guid analysisJobId, CancellationToken cancellationToken)
    {
        var job = await _db.AnalysisJobs.FirstOrDefaultAsync(j => j.Id == analysisJobId, cancellationToken)
            ?? throw new InvalidOperationException($"AnalysisJob {analysisJobId} not found.");

        job.AggregateStartedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        // TODO Slice 4: compute ScanMetric rows across Overall / Platform / Topic / Lens / Competitor / SourceType scopes.
        _logger.LogInformation(
            "MetricAggregationJob skeleton ran for AnalysisJob {AnalysisJobId} (no real aggregation yet — see Slice 4).",
            analysisJobId);

        job.AggregateCompletedAt = DateTime.UtcNow;
        job.Status = AnalysisJobStatus.Completed;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
