using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// LLM-named entity that the extractor couldn't resolve to a tracked Competitor
/// or Product (Phase 3 plan §3, D19). Preserved here as a signal for a future
/// "promote to tracked" screen (the LLM may surface real competitors we
/// haven't added yet). Forward-only promotion model: after a user promotes
/// "Acme" to a tracked Competitor, future scans capture Acme as
/// <see cref="Mention"/> rows; historical candidate rows stay here as audit.
///
/// <c>ClaimedEntityType</c> records what the LLM thought the entity was
/// (Competitor or Product). <c>NormalizedName</c> drives the dedup/grouping
/// query that the promote screen reads.
/// </summary>
public class MentionCandidate
{
    public Guid Id { get; set; }
    public Guid AIAnswerId { get; set; }

    /// <summary>Competitor or Product — what the LLM claimed the entity was.</summary>
    public MentionEntityType ClaimedEntityType { get; set; }
    /// <summary>Exact name as the LLM reported it.</summary>
    public string ClaimedName { get; set; } = string.Empty;
    /// <summary>Lowercase + canonical form for dedup across answers.</summary>
    public string NormalizedName { get; set; } = string.Empty;

    public string EvidenceSnippet { get; set; } = string.Empty;
    public double ConfidenceScore { get; set; }
    public DateTime CreatedAt { get; set; }

    public AIAnswer AIAnswer { get; set; } = null!;
}
