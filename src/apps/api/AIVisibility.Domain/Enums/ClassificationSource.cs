namespace AIVisibility.Domain.Enums;

/// <summary>
/// Provenance of a <see cref="Entities.BrandSourceClassification"/> row —
/// what produced the classification. Used downstream for trust + audit and
/// to decide whether a re-classification pass is allowed to overwrite the
/// row (user verdicts are immutable to auto-classifiers).
/// </summary>
public enum ClassificationSource
{
    /// <summary>URL-domain match against the tracked brand or a tracked competitor — written by the deterministic first pass.</summary>
    RuleBased,
    /// <summary>LLM source classifier picked a SourceType from the answer's context — written by the post-extraction classification pass and is the primary provenance for non-Owned/Competitor sources.</summary>
    LLMClassified,
    /// <summary>User overrode the auto-classifier verdict from the reporting UI. Locks the row against future auto-classifier sweeps.</summary>
    UserCorrected,
}
