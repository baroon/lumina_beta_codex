using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// One quality the AI ascribed to a <see cref="Mention"/> — "in-depth
/// analysis", "trustworthy", "slow to break news" (Phase 4 measurement-
/// model expansion, item #10).
///
/// Polarity is independent of the per-Mention sentiment: a positive-
/// sentiment Mention can still carry a negative attribute ("reliable
/// for breaking news but slow for analysis"), which is the load-bearing
/// reason we capture this separately from the existing enum. Append-
/// only (D16); cascade-deleted with its <see cref="Mention"/>.
/// </summary>
public class MentionAttribute
{
    public Guid Id { get; set; }
    public Guid MentionId { get; set; }

    /// <summary>Normalized attribute label — lowercased + collapsed whitespace; LLM-emitted free text.</summary>
    public string Name { get; set; } = string.Empty;

    public AttributePolarity Polarity { get; set; } = AttributePolarity.Neutral;

    /// <summary>Quoted text from the answer supporting the attribute; truncated to 500 chars.</summary>
    public string EvidenceSnippet { get; set; } = string.Empty;

    public double ConfidenceScore { get; set; }
    public DateTime CreatedAt { get; set; }

    public Mention Mention { get; set; } = null!;
}
