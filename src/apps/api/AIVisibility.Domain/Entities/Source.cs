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
/// <see cref="SourceName"/> otherwise (mentioned-source case).
/// </summary>
public class Source
{
    public Guid Id { get; set; }

    /// <summary>Display name (as reported by the LLM, before normalization).</summary>
    public string SourceName { get; set; } = string.Empty;

    /// <summary>Optional raw domain (e.g. "blog.acme.com"); null for mentioned-source citations without URL.</summary>
    public string? Domain { get; set; }

    /// <summary>Canonical domain (lowercase, "www." stripped) used for dedup + classification.</summary>
    public string? NormalizedDomain { get; set; }

    public DateTime CreatedAt { get; set; }

    public ICollection<SourceUrl> Urls { get; set; } = new List<SourceUrl>();
}
