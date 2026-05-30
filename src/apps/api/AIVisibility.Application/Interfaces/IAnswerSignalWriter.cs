namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Persists one answer's signal-extraction result: the AnswerSignal, its
/// Mentions / MentionCandidates, and Citation rows (joined to canonical
/// Source / SourceUrl / BrandSourceClassification entries, deduping on each
/// call against rows already in the DB).
///
/// Called inline from <c>ScanExecutor</c> after every AIAnswer is saved so
/// the live counters on the scan-progress screen tick up as the scan runs,
/// instead of waiting for a post-scan extraction job.
/// </summary>
public interface IAnswerSignalWriter
{
    Task WriteAsync(
        SignalExtractionResult result,
        SignalExtractionContext context,
        CancellationToken cancellationToken);
}

/// <summary>
/// Builds the scan-wide context used by every per-answer extraction call.
/// </summary>
public interface ISignalExtractionContextFactory
{
    Task<SignalExtractionContext> BuildAsync(Guid scanRunId, CancellationToken cancellationToken);
}
