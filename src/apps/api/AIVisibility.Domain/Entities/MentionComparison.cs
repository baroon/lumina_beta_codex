namespace AIVisibility.Domain.Entities;

/// <summary>
/// A head-to-head comparison the answer drew between this mentioned entity
/// and another entity, on a specific dimension (Phase 4 measurement-model
/// expansion, item 15). Lets us answer questions like "on price, the AI
/// favours us; on support quality, it favours Acme" — independent of overall
/// sentiment, since X is better than Y for Z is a directed claim that
/// neither X-positive nor Y-negative captures cleanly.
///
/// One row per (mention, vs_entity, aspect) triple. The "vs" entity is
/// stored verbatim from the LLM plus a normalized form for grouping; no
/// FK because the comparison foil may be an entity we do not track.
/// Append-only (D16). Cascade-deleted with the parent Mention.
/// </summary>
public class MentionComparison
{
    public Guid Id { get; set; }
    public Guid MentionId { get; set; }

    /// <summary>Exact entity name being compared against, from the LLM.</summary>
    public string VsEntityName { get; set; } = string.Empty;
    /// <summary>Lowercase + canonical form for cross-answer grouping.</summary>
    public string VsEntityNormalized { get; set; } = string.Empty;

    /// <summary>
    /// Canonical snake_case aspect / dimension (e.g. "price", "speed",
    /// "support_quality", "depth_of_coverage"). Normalized by the extractor
    /// so cross-answer aggregation works.
    /// </summary>
    public string OnAspect { get; set; } = string.Empty;

    /// <summary>
    /// True when THIS mention's entity wins the comparison; false when the
    /// vs_entity wins. Ties / unclear winners are skipped at parse time
    /// (the row is not emitted).
    /// </summary>
    public bool WinnerIsThisMention { get; set; }

    /// <summary>Short quote from the answer supporting the comparison; truncated to 500 chars.</summary>
    public string EvidenceSnippet { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public Mention Mention { get; set; } = null!;
}
