namespace AIVisibility.Domain.Enums;

/// <summary>
/// Human-review status for a <see cref="Entities.FactualClaim"/>. Newly
/// extracted claims land as <c>Pending</c>; the review UI flips them to
/// <c>Verified</c>, <c>Disputed</c>, <c>NeedsContext</c>, or <c>Ignored</c>.
/// Trend reporting can roll these up into a "% accuracy" series per brand over time.
/// </summary>
public enum ClaimReviewStatus
{
    Pending,
    Verified,
    Disputed,
    NeedsContext,
    Ignored,
}
