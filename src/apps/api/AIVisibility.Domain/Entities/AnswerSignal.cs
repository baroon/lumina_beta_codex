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
    public Sentiment BrandSentiment { get; set; } = Sentiment.Unknown;
    public RecommendationStrength BrandRecommendationStrength { get; set; } = RecommendationStrength.Unknown;
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
