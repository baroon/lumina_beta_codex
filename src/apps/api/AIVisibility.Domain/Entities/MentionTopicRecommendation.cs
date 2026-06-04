using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// A topic-scoped recommendation for an entity in an answer (Phase 4
/// measurement-model expansion, item 13). Distinct from
/// <see cref="MentionRecommendationContext"/> (which captures unstructured
/// "Recommended for X" phrases) — this row carries the explicit boolean
/// + strength for a NAMED topic, so the aggregator can roll up
/// "recommended for breaking news but NOT for analysis" cleanly. The
/// topic_name is verbatim from the LLM; no FK to PromptTopic because the
/// AI may invoke topics outside the tracked set.
///
/// Append-only (D16). Cascade-deleted with the parent Mention.
/// </summary>
public class MentionTopicRecommendation
{
    public Guid Id { get; set; }
    public Guid MentionId { get; set; }

    /// <summary>Exact topic label as the LLM wrote it (e.g. "breaking news").</summary>
    public string TopicName { get; set; } = string.Empty;
    /// <summary>Lowercase + canonical form for cross-answer grouping.</summary>
    public string TopicNormalized { get; set; } = string.Empty;

    public bool IsRecommended { get; set; }
    public RecommendationStrength Strength { get; set; } = RecommendationStrength.Unknown;

    public DateTime CreatedAt { get; set; }

    public Mention Mention { get; set; } = null!;
}
