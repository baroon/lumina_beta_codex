using AIVisibility.Domain.Enums;
using MediatR;

namespace AIVisibility.Application.Commands.FactualClaims;

/// <summary>
/// Sets the <see cref="ClaimReviewStatus"/> on a single factual claim
/// after a human review (Phase 4 measurement-model expansion, item
/// #14). This is the only mutation allowed on the otherwise
/// append-only <c>FactualClaim</c> table (per the entity contract);
/// transitions between Pending / Verified / Disputed / NeedsContext / Ignored are all
/// permitted because reviewers occasionally need to revise an earlier
/// verdict. Workspace ownership is enforced before write — claim →
/// mention → answer → prompt → tracker → brand → workspace.
/// </summary>
public record UpdateFactualClaimReviewStatusCommand(
    Guid ClaimId,
    ClaimReviewStatus ReviewStatus) : IRequest<UpdateFactualClaimReviewStatusResult>;

public sealed record UpdateFactualClaimReviewStatusResult(ClaimReviewStatus ReviewStatus);
