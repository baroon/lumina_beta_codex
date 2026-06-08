using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// Structured context for an entity recommendation in an answer. Captures
/// the scenario/use-case granularity ("RecommendedFor": "investigative
/// journalism", "small teams") plus the limitations the AI flagged
/// ("WithCaveats": "not for breaking news", "expensive at scale") as
/// ordered rows. Sits alongside <see cref="Mention.IsRecommended"/>
/// (the overall yes/no for the mention) — the boolean answers "did the
/// answer recommend this entity at all"; this table answers "for what
/// and with what caveats."
///
/// One row per (mention, context_type, value) triple. Append-only (D16).
/// Cascade-deleted with the parent Mention.
/// </summary>
public class MentionRecommendationContext
{
    public Guid Id { get; set; }
    public Guid MentionId { get; set; }

    public RecommendationContextType ContextType { get; set; } = RecommendationContextType.RecommendedFor;

    /// <summary>
    /// The context value the answer gave — for RecommendedFor: scenarios
    /// like "investigative journalism" or "small teams". For WithCaveats:
    /// limitations like "not for breaking news" or "expensive at scale".
    /// Lowercased + whitespace-collapsed for grouping.
    /// </summary>
    public string ContextValue { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public Mention Mention { get; set; } = null!;
}
