using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// Brand-contextual classification of a <see cref="Source"/> into the
/// 12-value <see cref="SourceType"/> taxonomy (ADR-003
/// §BrandSourceClassification). Classification is per-brand because a
/// domain can be Owned for one brand and Competitor for another
/// (livecareer.com is Owned for LiveCareer but Competitor for Zety).
///
/// Created automatically by <c>SignalExtractor</c> during signal extraction
/// (provenance = <see cref="ClassificationSource.RuleBased"/> for the v1
/// URL-domain matcher) and reused across subsequent scans for the same
/// (brand, source) pair. Users can confirm / correct via Phase 5 reporting.
/// </summary>
public class BrandSourceClassification
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public Guid SourceId { get; set; }
    public Guid? SourceUrlId { get; set; }

    public SourceType SourceType { get; set; }

    public double ConfidenceScore { get; set; }

    /// <summary>What produced this classification — rule, list, LLM, or user.</summary>
    public ClassificationSource ProvenanceSource { get; set; }

    /// <summary>Lifecycle status: Suggested / Active / UserCorrected / Unknown.</summary>
    public ClassificationStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Brand Brand { get; set; } = null!;
    public Source Source { get; set; } = null!;
    public SourceUrl? SourceUrlNav { get; set; }
}
