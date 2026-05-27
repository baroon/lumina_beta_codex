using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// One citation (explicit URL or mentioned source) extracted from an AIAnswer
/// (ADR-003 §Citation). Phase 4 Slice 0 normalized the inline-classification
/// shape into the full Source / SourceUrl / BrandSourceClassification model:
/// source name + URL + classification are no longer stored on the citation
/// row itself — they live on the normalized side and join through
/// <see cref="SourceId"/> / <see cref="SourceUrlId"/>.
///
/// Created by <c>SignalExtractor</c>. Append-only (D16). Cascade-deleted
/// with its AIAnswer (D17).
/// </summary>
public class Citation
{
    public Guid Id { get; set; }
    public Guid AIAnswerId { get; set; }

    /// <summary>FK to the deduped <see cref="Source"/> row.</summary>
    public Guid SourceId { get; set; }

    /// <summary>FK to a specific <see cref="SourceUrl"/>; null when the citation has no URL.</summary>
    public Guid? SourceUrlId { get; set; }

    public CitationType CitationType { get; set; }

    /// <summary>1-based position in the answer where the citation appeared; null when not extractable.</summary>
    public int? CitationPosition { get; set; }

    /// <summary>Optional verbatim citation text from the answer (e.g. the markdown link text).</summary>
    public string? CitationText { get; set; }

    public double ConfidenceScore { get; set; }
    public DateTime CreatedAt { get; set; }

    public AIAnswer AIAnswer { get; set; } = null!;
    public Source Source { get; set; } = null!;
    public SourceUrl? SourceUrl { get; set; }
}
