using AIVisibility.Domain.Entities;

namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Per-scan context the extractor needs to resolve LLM-named entities against
/// the tracker's tracked universe (Phase 3 plan §3, D12 + D18 + D19). Built
/// once per scan by <c>SignalExtractionJob</c> and passed to every per-answer
/// extraction call so the LLM mention names can be matched without re-querying.
/// </summary>
public sealed record SignalExtractionContext(
    Brand Brand,
    IReadOnlyList<Competitor> TrackedCompetitors,
    IReadOnlyList<Product> TrackedProducts);

/// <summary>
/// All entity rows produced by one per-answer extraction call. Persisted by
/// the job in a single batch (Phase 3 plan §4 pipeline step 2).
/// </summary>
public sealed record SignalExtractionResult(
    AnswerSignal Signal,
    IReadOnlyList<Mention> Mentions,
    IReadOnlyList<MentionCandidate> Candidates,
    IReadOnlyList<Citation> Citations);
