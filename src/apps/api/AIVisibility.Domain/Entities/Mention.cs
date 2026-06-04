using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// One occurrence of a tracked entity (brand / competitor / product) inside an
/// AIAnswer (Phase 3 plan §3, D12 + D18). Polymorphic: <see cref="EntityId"/>
/// points at the Brand / Competitor / Product row of the corresponding
/// <see cref="EntityType"/>. ENFORCED by a DB CHECK constraint that EntityId
/// is never null — D18 dropped the `Other` type, so unresolved entities go to
/// <see cref="MentionCandidate"/> instead.
///
/// Multiple mentions per answer expected (e.g. brand + 3 competitors in one
/// answer, each with its own sentiment + recommendation strength).
///
/// Created by <c>SignalExtractor</c> per AIAnswer. Append-only (D16).
/// </summary>
public class Mention
{
    public Guid Id { get; set; }
    public Guid AIAnswerId { get; set; }

    public MentionEntityType EntityType { get; set; }
    /// <summary>FK to Brand / Competitor / Product row. Always non-null (CHECK constraint).</summary>
    public Guid EntityId { get; set; }

    /// <summary>Canonical name used for grouping/deduping (matches the tracked entity's Name).</summary>
    public string NormalizedName { get; set; } = string.Empty;

    public bool IsRecommended { get; set; }
    public RecommendationStrength RecommendationStrength { get; set; } = RecommendationStrength.Unknown;
    public Sentiment Sentiment { get; set; } = Sentiment.Unknown;

    /// <summary>
    /// Numeric per-mention sentiment, range [-1.0, +1.0]. Mirrors
    /// <see cref="AnswerSignal.BrandSentimentScore"/> at the per-entity
    /// grain — used by future per-competitor / per-product sentiment
    /// aggregations + the co-mention-matrix analysis.
    /// </summary>
    public double SentimentScore { get; set; }

    public double ConfidenceScore { get; set; }
    /// <summary>Short text snippet (sentence/paragraph) supporting the mention; truncated to 2000 chars.</summary>
    public string EvidenceSnippet { get; set; } = string.Empty;

    /// <summary>
    /// How many times this entity is named in the answer text. Default 1 —
    /// a Mention only exists because the entity appeared at least once.
    /// Computed deterministically by <c>SignalExtractor</c> from a
    /// case-insensitive search of <see cref="NormalizedName"/> in
    /// <see cref="AIAnswer.AnswerText"/>; if the canonical name isn't found
    /// (LLM paraphrased the entity), falls back to 1.
    /// </summary>
    public int MentionCount { get; set; } = 1;

    /// <summary>
    /// Normalized position of the first occurrence in the answer text:
    /// 0.0 = very beginning, 1.0 = very end. Lower = more prominent.
    /// Computed deterministically by <c>SignalExtractor</c>; falls back to
    /// 0.5 (middle, neutral) when the canonical name can't be found in the
    /// text. Powers the prominence-weighted metrics in
    /// <c>MetricAggregator</c>.
    /// </summary>
    public double FirstMentionPosition { get; set; } = 0.5;

    public DateTime CreatedAt { get; set; }

    public AIAnswer AIAnswer { get; set; } = null!;
}
