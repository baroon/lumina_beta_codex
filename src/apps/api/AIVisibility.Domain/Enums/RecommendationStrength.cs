namespace AIVisibility.Domain.Enums;

/// <summary>
/// Generic recommendation-strength value (Phase 3 plan D13). Used by
/// AnswerSignal.BrandRecommendationStrength AND Mention.RecommendationStrength.
///
/// Scale (baked into the extractor prompt):
///   Strong          — top pick / unreserved recommendation
///   Moderate        — recommended with caveats
///   Weak            — mentioned as an option
///   NotRecommended  — recommended against
///   Unknown         — not mentioned, or strength can't be inferred
/// </summary>
public enum RecommendationStrength
{
    Strong,
    Moderate,
    Weak,
    NotRecommended,
    Unknown,
}
