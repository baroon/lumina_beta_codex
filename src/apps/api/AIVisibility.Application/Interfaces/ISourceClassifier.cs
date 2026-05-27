using AIVisibility.Domain.Enums;

namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Classifies a <see cref="Domain.Entities.Source"/> into the 12-value
/// <see cref="SourceType"/> taxonomy (Phase 4 v1 plan §Block 1). Called by
/// <c>SignalExtractionJob</c> for newly-seen sources whose URL-domain
/// rule-based verdict was <see cref="SourceType.Unknown"/> — Owned and
/// Competitor verdicts from the URL matcher are not re-classified (D5,
/// the URL matcher has higher confidence there).
///
/// Returns null on failure (LLM error, empty/invalid response). The caller
/// keeps the existing RuleBased verdict + logs; one bad classification must
/// not stop the rest of the scan persisting (D4).
/// </summary>
public interface ISourceClassifier
{
    Task<SourceClassificationVerdict?> ClassifyAsync(
        SourceClassificationRequest request,
        CancellationToken cancellationToken);
}

/// <summary>
/// Inputs the classifier sees per source: the LLM-reported display name,
/// the canonical domain (when a URL was present), and one sample URL the
/// source was cited under (for context — sometimes the path discriminates,
/// e.g. <c>example.gov/news/article</c> vs <c>example.gov</c> root).
/// </summary>
public sealed record SourceClassificationRequest(
    string SourceName,
    string? NormalizedDomain,
    string? SampleUrl);

/// <summary>
/// LLM verdict per source. <see cref="Rationale"/> is one sentence explaining
/// the choice — useful for debugging mis-classifications without re-querying
/// the LLM and for surfacing in any future "why was this classified X?"
/// affordance.
/// </summary>
public sealed record SourceClassificationVerdict(
    SourceType SourceType,
    double ConfidenceScore,
    string? Rationale);
