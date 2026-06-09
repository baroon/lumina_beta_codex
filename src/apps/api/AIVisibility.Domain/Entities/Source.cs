namespace AIVisibility.Domain.Entities;

/// <summary>
/// A cited source — identified by name and optional domain — that the LLM
/// referenced in an answer (ADR-003 §Source). Cross-tracker entity: the
/// same "Trustpilot" or "G2" Source row is shared across every brand /
/// scan that cites them. Classification is brand-contextual (see
/// <see cref="BrandSourceClassification"/>) because a domain can be Owned
/// for one brand and Competitor for another.
///
/// Created lazily by <c>SignalExtractor</c> during signal extraction.
/// Deduped by <see cref="NormalizedDomain"/> when a URL is present, by
/// <see cref="SourceName"/> otherwise (mentioned-source case). DB-level
/// partial UNIQUE indexes enforce the dedup invariant against concurrent
/// writers.
/// </summary>
public class Source
{
    public Guid Id { get; set; }

    /// <summary>Display name (as reported by the LLM, before normalization).</summary>
    public string SourceName { get; set; } = string.Empty;

    /// <summary>Canonical domain (lowercase, "www." stripped) used for dedup + classification. Null for mentioned-source citations without URL.</summary>
    public string? NormalizedDomain { get; set; }

    /// <summary>
    /// Curated authority score on a 0-100 scale (Phase 4 measurement-model
    /// expansion, item 16). Null = no opinion (domain not on the curated
    /// list). Major newsroom + reference domains land 70-100; tier-2
    /// industry publications 40-69; user-generated content 10-39. The
    /// score lets aggregations weight citations beyond the existing
    /// Owned/Competitor/ThirdParty buckets.
    /// </summary>
    public double? AuthorityScore { get; set; }

    /// <summary>
    /// When the cited content was published, if extractable. Currently null
    /// across the board — the schema is in place for a future enrichment
    /// pass that scrapes / extracts publish dates. "6-month-old source vs
    /// 6-year-old source" is the recency dimension we want once the
    /// pipeline can populate it.
    /// </summary>
    public DateTime? PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public ICollection<SourceUrl> Urls { get; set; } = new List<SourceUrl>();
}
