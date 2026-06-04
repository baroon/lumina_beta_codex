namespace AIVisibility.Domain.Enums;

/// <summary>
/// How checkable is a <see cref="Entities.FactualClaim"/>? Drives the
/// review pipeline: <c>Verifiable</c> claims feed the human-review inbox
/// + future automated fact-check jobs; <c>Subjective</c> and
/// <c>Unverifiable</c> claims surface for context but aren't expected
/// to ever flip to Verified/Disputed.
/// </summary>
public enum ClaimVerifiability
{
    /// <summary>Look-uppable in Wikipedia, on the brand's site, or via a search ("Founded in 1975", "Owned by X").</summary>
    Verifiable,

    /// <summary>Opinion-adjacent or reputational ("Widely regarded as…", "Trusted source").</summary>
    Subjective,

    /// <summary>Speculative or about the future ("Will likely IPO next year").</summary>
    Unverifiable,
}
