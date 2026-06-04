namespace AIVisibility.Domain.Enums;

/// <summary>
/// What kind of structured recommendation context a
/// <see cref="Entities.MentionRecommendationContext"/> row carries
/// (Phase 4 measurement-model expansion, item 2).
/// </summary>
public enum RecommendationContextType
{
    /// <summary>"Recommended for X" — scenarios, use cases, audiences the answer endorses the entity for.</summary>
    RecommendedFor,
    /// <summary>"With caveats about Y" — situations or limitations the answer flags.</summary>
    WithCaveats,
}
