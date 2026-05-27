using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;

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
/// All entity rows produced by one per-answer extraction call. The job
/// dedups draft citations across answers, creates canonical Source / SourceUrl /
/// BrandSourceClassification rows, then persists Citation rows pointing at the
/// canonical IDs (Phase 4 Slice 0 normalized model).
/// </summary>
public sealed record SignalExtractionResult(
    AnswerSignal Signal,
    IReadOnlyList<Mention> Mentions,
    IReadOnlyList<MentionCandidate> Candidates,
    IReadOnlyList<DraftCitation> Citations);

/// <summary>
/// LLM-reported citation enriched with the v1 URL-domain classifier's
/// verdict, but NOT yet bound to a persisted <see cref="Source"/> /
/// <see cref="SourceUrl"/> / <see cref="BrandSourceClassification"/> row.
/// The job dedups + assigns canonical IDs at persistence time so cross-
/// answer citations of the same source collapse to one Source row.
/// </summary>
public sealed record DraftCitation(
    Guid AIAnswerId,
    /// <summary>Raw LLM-reported source name. Trimmed to 500 chars.</summary>
    string SourceName,
    /// <summary>Lowercase canonical form of <see cref="SourceName"/>, used to dedup mentioned-source citations without URL.</summary>
    string NormalizedSourceName,
    /// <summary>Raw URL when present; null for mentioned-source citations.</summary>
    string? Url,
    /// <summary>Canonical domain (host, lowercase, "www." stripped); null when <see cref="Url"/> is null.</summary>
    string? NormalizedDomain,
    /// <summary>Canonical full URL used to dedup SourceUrl rows; null when <see cref="Url"/> is null.</summary>
    string? NormalizedUrl,
    CitationType CitationType,
    /// <summary>v1 classifier verdict — Owned / Competitor (domain match) or Unknown (no match).</summary>
    SourceType ClassifiedAs,
    double ConfidenceScore);
