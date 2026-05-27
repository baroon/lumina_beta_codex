namespace AIVisibility.Domain.Enums;

/// <summary>
/// Provenance of a <see cref="Entities.BrandSourceClassification"/> row —
/// what produced the classification, used downstream for trust + audit
/// (ADR-003 §BrandSourceClassification).
/// </summary>
public enum ClassificationSource
{
    /// <summary>Code-level rule (e.g. URL-domain match against brand or tracked competitors).</summary>
    RuleBased,
    /// <summary>Static known-domain table (e.g. Reddit→UGC, Wikipedia→Reference).</summary>
    KnownDomainList,
    /// <summary>LLM classified the source from context.</summary>
    LLMClassified,
    /// <summary>User confirmed an existing classification.</summary>
    UserConfirmed,
    /// <summary>User overrode the automatic classification.</summary>
    UserCorrected,
}
