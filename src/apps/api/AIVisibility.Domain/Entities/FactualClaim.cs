using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// A check-able fact the AI asserted about a <see cref="Mention"/> —
/// founding year, parent company, headcount, leadership, product
/// features, prices, awards (Phase 4 measurement-model expansion,
/// item #14). The extractor identifies + isolates the claim; this
/// table holds the raw row + a review status so a human (or a future
/// automated fact-check job) can flip it to Verified or Disputed.
///
/// The point: AI answers about a brand routinely include factual
/// errors ("India Today is a daily newspaper" — it's a weekly
/// magazine). Capturing them per-claim makes those errors actionable
/// instead of buried in the answer text.
///
/// Append-only on initial insert (D16); cascade-deleted with its
/// <see cref="Mention"/>. The <see cref="ReviewStatus"/> column is
/// the one exception to immutability — it flips Pending→Verified/Disputed
/// via the future review UI.
/// </summary>
public class FactualClaim
{
    public Guid Id { get; set; }
    public Guid MentionId { get; set; }

    /// <summary>Full claim as a sentence — what the AI asserted.</summary>
    public string ClaimText { get; set; } = string.Empty;

    /// <summary>
    /// Normalized category (lowercased, snake-cased): `founding_year`,
    /// `parent_company`, `headquarters`, `leadership`, `product_feature`,
    /// `price`, `award`, etc. Free text — the LLM names the subject and
    /// we don't constrain to a taxonomy yet.
    /// </summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>The specific value asserted (e.g. "1975", "Living Media India").</summary>
    public string AssertedValue { get; set; } = string.Empty;

    /// <summary>Quoted sentence(s) from the answer that support the claim; truncated to 500 chars.</summary>
    public string EvidenceSnippet { get; set; } = string.Empty;

    public ClaimVerifiability Verifiability { get; set; } = ClaimVerifiability.Verifiable;

    /// <summary>Reviewer-facing state — starts Pending, flips Verified/Disputed via the future review UI.</summary>
    public ClaimReviewStatus ReviewStatus { get; set; } = ClaimReviewStatus.Pending;

    public double ConfidenceScore { get; set; }
    public DateTime CreatedAt { get; set; }

    public Mention Mention { get; set; } = null!;
}
