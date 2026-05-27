using Hangfire;

namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Hangfire-invoked job that computes ScanMetric rows from the per-answer
/// extraction outputs (per Phase 3 plan §4, stage 2). Chained as a
/// Hangfire continuation after <see cref="ISignalExtractionJob"/>; only
/// runs if the extract job succeeded.
///
/// Slice (c) fills in the metric computation; Slice 1 shipped the skeleton.
/// </summary>
public interface IMetricAggregationJob
{
    /// <remarks>
    /// <see cref="AutomaticRetryAttribute"/> is on the interface method
    /// because ScanExecutor schedules the continuation via the interface type
    /// (<c>_jobs.ContinueJobWith&lt;IMetricAggregationJob&gt;(...)</c>) —
    /// Hangfire reads filter attributes from the serialized job target. Per
    /// Phase 3 plan D3: 1 retry on aggregate — it's deterministic SQL/math,
    /// so if it fails twice the issue is code or data, not transient.
    /// </remarks>
    [AutomaticRetry(Attempts = 1)]
    Task AggregateAsync(Guid analysisJobId, CancellationToken cancellationToken);
}
