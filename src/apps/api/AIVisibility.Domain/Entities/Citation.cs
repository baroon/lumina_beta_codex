using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// One citation (explicit URL or mentioned source) extracted from an AIAnswer
/// (Phase 3 plan §3, D14 — Option A inline citations). The minimum-viable
/// shape: source name + optional URL + auto-classification by URL-domain
/// match. Phase 4 Slice 0 (hard gate) refactors to Source / SourceUrl /
/// BrandSourceClassification — the enum values stay the same.
///
/// Created by <c>SignalExtractor</c>. Append-only (D16). Cascade-deleted with
/// its AIAnswer (D17).
/// </summary>
public class Citation
{
    public Guid Id { get; set; }
    public Guid AIAnswerId { get; set; }

    /// <summary>Source name as reported by the LLM (e.g. "Trustpilot", "Acme blog").</summary>
    public string SourceName { get; set; } = string.Empty;
    /// <summary>Lowercase + canonical form of <see cref="SourceName"/> for dedup/grouping.</summary>
    public string NormalizedSourceName { get; set; } = string.Empty;

    /// <summary>Null when the LLM reports a "mentioned source" without a URL.</summary>
    public string? Url { get; set; }
    /// <summary>Derived from <see cref="Url"/>; null when Url is null.</summary>
    public string? NormalizedDomain { get; set; }

    public SourceClassification Classification { get; set; } = SourceClassification.Unknown;
    public CitationType CitationType { get; set; }

    public double ConfidenceScore { get; set; }
    public DateTime CreatedAt { get; set; }

    public AIAnswer AIAnswer { get; set; } = null!;
}
