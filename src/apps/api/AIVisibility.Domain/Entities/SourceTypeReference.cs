namespace AIVisibility.Domain.Entities;

/// <summary>
/// The 12-value SourceType controlled taxonomy as a reference table
/// (Phase 3 plan §6.1, ADR-003 §Source Type Taxonomy). One row per
/// <see cref="Enums.SourceType"/> value; the <see cref="Code"/> column
/// matches the enum's <c>ToString()</c> form. Holds the display name and
/// definition text so reporting UI can render tooltips + selectors without
/// hardcoding copy.
///
/// Soft reference: <see cref="BrandSourceClassification.SourceType"/> stores
/// the enum value as a varchar (matching the codebase's other enum-stored-
/// as-string pattern); no DB-level FK to this table. The link is by code.
/// </summary>
public class SourceTypeReference
{
    public Guid Id { get; set; }

    /// <summary>Canonical code — matches <see cref="Enums.SourceType"/> ToString.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Display name for UI.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>ADR-003 definition text, used for tooltips / docs.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Sort order in selectors.</summary>
    public int DisplayOrder { get; set; }
}
