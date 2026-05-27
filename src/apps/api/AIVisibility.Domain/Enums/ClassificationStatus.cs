namespace AIVisibility.Domain.Enums;

/// <summary>
/// Lifecycle status of a <see cref="Entities.BrandSourceClassification"/>
/// (ADR-003 §BrandSourceClassification). Drives whether a classification is
/// shown in reporting and whether the user has acted on it.
/// </summary>
public enum ClassificationStatus
{
    /// <summary>Newly created by an automatic classifier; not yet user-confirmed.</summary>
    Suggested,
    /// <summary>Active classification — either user-confirmed or auto-classified with high confidence.</summary>
    Active,
    /// <summary>User explicitly corrected an earlier classification.</summary>
    UserCorrected,
    /// <summary>Classifier could not determine a source type.</summary>
    Unknown,
}
