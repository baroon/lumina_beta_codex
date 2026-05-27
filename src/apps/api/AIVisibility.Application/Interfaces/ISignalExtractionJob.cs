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
    Task ExtractAsync(Guid analysisJobId, CancellationToken cancellationToken);
}
