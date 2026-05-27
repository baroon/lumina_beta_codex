namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Hangfire-invoked job that computes ScanMetric rows from the per-answer
/// extraction outputs (per Phase 3 plan §4, stage 2). Chained as a
/// Hangfire continuation after <see cref="ISignalExtractionJob"/>; only
/// runs if the extract job succeeded.
///
/// Slice 1 ships the skeleton: status/timestamp transitions only, no real
/// aggregation. Slice 4 fills in the metric computation.
/// </summary>
public interface IMetricAggregationJob
{
    Task AggregateAsync(Guid analysisJobId, CancellationToken cancellationToken);
}
