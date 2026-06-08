namespace AIVisibility.Domain.Enums;

/// <summary>
/// Lifecycle status of a <see cref="Entities.BrandSourceClassification"/>.
/// Drives whether a classification is shown in reporting and whether the
/// user has acted on it.
/// </summary>
public enum ClassificationStatus
{
    /// <summary>Active classification — either auto-classified successfully or user-confirmed. The only value the reporting query filter accepts.</summary>
    Active,
    /// <summary>User explicitly corrected the auto-classifier's verdict. Protects the row from being overwritten by future auto-classifier sweeps.</summary>
    UserCorrected,
    /// <summary>Classifier could not determine a source type — row exists but is hidden from reports.</summary>
    Unknown,
}
