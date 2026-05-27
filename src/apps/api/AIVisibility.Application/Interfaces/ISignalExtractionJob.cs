using Hangfire;

namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Hangfire-invoked job that extracts signals + mentions + citations from
/// every AIAnswer in the analyzed scan (per Phase 3 plan §4, stage 1).
///
/// Slice 1 ships the skeleton: status/timestamp transitions only, no real
/// extraction. Slice 2 fills in the per-answer LLM call.
/// </summary>
public interface ISignalExtractionJob
{
    /// <remarks>
    /// <see cref="AutomaticRetryAttribute"/> is on the interface method
    /// because ScanExecutor enqueues via the interface type
    /// (<c>_jobs.Enqueue&lt;ISignalExtractionJob&gt;(...)</c>) — Hangfire
    /// reads filter attributes from the serialized job target. Per Phase 3
    /// plan D3: 3 retries on extract because LLM calls flake.
    /// </remarks>
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 240, 960 })]
    Task ExtractAsync(Guid analysisJobId, CancellationToken cancellationToken);
}
