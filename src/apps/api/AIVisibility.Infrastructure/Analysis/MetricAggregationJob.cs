using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Reads Slice 2's extracted evidence (AnswerSignal + Mention + Citation rows)
/// for the scan and persists a batch of <see cref="Domain.Entities.ScanMetric"/>
/// rows across five scopes — Overall, Platform, Lens, Topic, Competitor — via
/// <see cref="MetricAggregator"/> (Phase 3 plan §4 step 3, D15). On exit
/// flips <see cref="Domain.Enums.AnalysisJobStatus.Completed"/>.
///
/// Retry policy per D3: 1 attempt. Aggregation is deterministic SQL/in-memory
/// math; if it fails twice the issue is code/data not transient.
/// </summary>
public class MetricAggregationJob : IMetricAggregationJob
{
    private readonly IAppDbContext _db;
    private readonly MetricAggregator _aggregator;
    private readonly ILogger<MetricAggregationJob> _logger;

    public MetricAggregationJob(
        IAppDbContext db,
        MetricAggregator aggregator,
        ILogger<MetricAggregationJob> logger)
    {
        _db = db;
        _aggregator = aggregator;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 1)]
    public async Task AggregateAsync(Guid analysisJobId, CancellationToken cancellationToken)
    {
        var job = await _db.AnalysisJobs.FirstOrDefaultAsync(j => j.Id == analysisJobId, cancellationToken)
            ?? throw new InvalidOperationException($"AnalysisJob {analysisJobId} not found.");

        job.AggregateStartedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            var rows = await _aggregator.ComputeAsync(job.ScanRunId, cancellationToken);
            foreach (var row in rows)
            {
                _db.ScanMetrics.Add(row);
            }
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "MetricAggregator wrote {Count} ScanMetric rows for AnalysisJob {AnalysisJobId} (scan {ScanRunId}).",
                rows.Count, analysisJobId, job.ScanRunId);

            job.AggregateCompletedAt = DateTime.UtcNow;
            job.Status = AnalysisJobStatus.Completed;
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "MetricAggregationJob threw for AnalysisJob {AnalysisJobId}", analysisJobId);
            job.Status = AnalysisJobStatus.Failed;
            job.ErrorMessage = $"{ex.GetType().Name}: {ex.Message}";
            await _db.SaveChangesAsync(CancellationToken.None);
            throw;
        }
    }
}
