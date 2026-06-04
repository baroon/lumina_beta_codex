using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// 1:1 with AIAnswer — captures brand-level signals extracted by the LLM
/// from a single answer (Phase 3 plan §3, D11). Source-cited count fields
/// are populated in Slice 3 once citations land; until then they stay 0.
///
/// Created by <c>SignalExtractor</c>, persisted by <c>SignalExtractionJob</c>.
/// Append-only — never mutated after creation (D16).
/// </summary>
public class AnswerSignal
{
    public Guid Id { get; set; }
    public Guid AIAnswerId { get; set; }

    // Brand-level signals from the LLM
    public bool BrandMentioned { get; set; }
    public bool BrandRecommended { get; set; }
    /// <summary>1-based position in any ranked list in the answer; null when no list or not ranked.</summary>
    public int? BrandRank { get; set; }
    /// <summary>
    /// Size of the ranked universe — total entries in the list the brand was
    /// ranked against. Phase 4 measurement-model expansion (item 3): rank 3
    /// of 5 reads very differently from rank 3 of 50. Null when
    /// <see cref="BrandRank"/> is null, or when the LLM didn't report a
    /// universe size (some answers rank without naming the full list).
    /// </summary>
    public int? BrandRankUniverseSize { get; set; }
    public Sentiment BrandSentiment { get; set; } = Sentiment.Unknown;

    /// <summary>
    /// Numeric brand sentiment for this answer, range [-1.0, +1.0].
    /// -1.0 = strongly negative, 0.0 = neutral, +1.0 = strongly positive.
    /// Populated by the extractor LLM alongside <see cref="BrandSentiment"/>;
    /// when the LLM omits the score, derived from the enum
    /// (Positive→+0.75, Negative→-0.75, others→0). D13 absence coercion:
    /// when <see cref="BrandMentioned"/> is false, forced to 0 (same path
    /// the enum takes to Unknown).
    /// </summary>
    public double BrandSentimentScore { get; set; }

    public RecommendationStrength BrandRecommendationStrength { get; set; } = RecommendationStrength.Unknown;

    /// <summary>
    /// Numeric brand recommendation strength for this answer, range
    /// [-1.0, +1.0]. -1.0 = actively recommended-against, 0.0 = unmentioned
    /// or neutral, +1.0 = top pick / unreserved endorsement. Populated by
    /// the extractor LLM alongside <see cref="BrandRecommendationStrength"/>;
    /// when the LLM omits the score, derived from the enum (Strong→+0.9,
    /// Moderate→+0.5, Weak→+0.2, NotRecommended→-0.7, Unknown→0). D13
    /// absence coercion: when <see cref="BrandMentioned"/> is false,
    /// forced to 0 — parallels the enum-to-Unknown path.
    /// </summary>
    public double BrandRecommendationScore { get; set; }

    public string? TopRecommendedEntity { get; set; }

    // Answer-shape flags from the LLM
    public bool AnswerHasRanking { get; set; }
    public bool AnswerHasComparison { get; set; }
    public bool AnswerHasCitations { get; set; }

    // Source-cited counts — populated by citation post-processing in Slice 3.
    public int OwnedSourceCount { get; set; }
    public int CompetitorSourceCount { get; set; }
    public int ThirdPartySourceCount { get; set; }

    public double ConfidenceScore { get; set; }
    public DateTime CreatedAt { get; set; }

    public AIAnswer AIAnswer { get; set; } = null!;
}
