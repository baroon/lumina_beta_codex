using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// Risk / warning language the AI surfaced about the entity in this answer
/// (Phase 4 measurement-model expansion, item 11). Captured per-Mention so
/// an answer that recommends Lumina while flagging Acme for "recent layoffs"
/// produces a Mention.Sentiment=Positive for Lumina alongside a
/// MentionRiskFlag against Acme — concerns and sentiment are independent
/// signals. The same answer might also flag the recommended brand for a
/// minor concern; sentiment can stay Positive while a Low-severity risk
/// row appears.
///
/// Append-only (D16). Cascade-deleted with the parent Mention.
/// </summary>
public class MentionRiskFlag
{
    public Guid Id { get; set; }
    public Guid MentionId { get; set; }

    /// <summary>
    /// Short canonical type label (e.g. "layoffs", "lawsuit", "outage",
    /// "controversy", "security_incident"). Lowercased / underscored by the
    /// extractor so cross-answer grouping works. The LLM is asked to pick
    /// from a curated vocabulary; an unknown type still lands here as a
    /// free-text label.
    /// </summary>
    public string FlagType { get; set; } = string.Empty;

    public RiskSeverity Severity { get; set; } = RiskSeverity.Low;

    /// <summary>Short quote from the answer text supporting the flag; truncated to 500 chars.</summary>
    public string EvidenceSnippet { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public Mention Mention { get; set; } = null!;
}
