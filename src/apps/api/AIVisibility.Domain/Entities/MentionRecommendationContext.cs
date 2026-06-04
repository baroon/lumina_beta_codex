using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// Structured context for an entity recommendation in an answer (Phase 4
/// measurement-model expansion, item 2). The legacy <c>IsRecommended</c>
/// boolean collapsed "Recommended for current affairs only" and "Strongly
/// recommended overall" into the same value; this table captures the
/// scenario/use-case granularity ("RecommendedFor") plus the limitations
/// the AI flagged ("WithCaveats") as ordered rows.
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
