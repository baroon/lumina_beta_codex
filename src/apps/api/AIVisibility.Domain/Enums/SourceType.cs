namespace AIVisibility.Domain.Enums;

/// <summary>
/// Controlled taxonomy for source classification (ADR-003 §Source Type
/// Taxonomy). Backed by the <c>source_types</c> reference table per Phase 3
/// plan §6.1; the enum mirrors the seeded rows so application code can
/// reference values by name without an extra lookup.
///
/// v1 classifier (URL-domain match) only produces <see cref="Owned"/>,
/// <see cref="Competitor"/>, and <see cref="Unknown"/>; the more specific
/// values (UGC, Editorial, ReviewSite, etc.) are reserved for future
/// LLM-based or KnownDomainList classification.
/// </summary>
public enum SourceType
{
    Owned,
    Competitor,
    Corporate,
    UGC,
    Editorial,
    ReviewSite,
    Social,
    Institutional,
    Reference,
    Marketplace,
    Other,
    Unknown,
}
