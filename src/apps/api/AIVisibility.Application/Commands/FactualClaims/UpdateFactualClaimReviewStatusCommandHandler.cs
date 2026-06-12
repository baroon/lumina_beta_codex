using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.FactualClaims;

public class UpdateFactualClaimReviewStatusCommandHandler
    : IRequestHandler<
        UpdateFactualClaimReviewStatusCommand,
        UpdateFactualClaimReviewStatusResult>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public UpdateFactualClaimReviewStatusCommandHandler(
        IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<UpdateFactualClaimReviewStatusResult> Handle(
        UpdateFactualClaimReviewStatusCommand request, CancellationToken cancellationToken)
    {
        var claim = await _db.FactualClaims
            .FirstOrDefaultAsync(c => c.Id == request.ClaimId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Factual claim {request.ClaimId} not found.");

        // Walk claim → mention → answer → prompt → tracker → brand → workspace.
        // Reads are split into small queries (rather than a single join) because
        // the InMemory provider tends to materialize lazily on chains, and the
        // total cost is bounded by 1 row per step.
        var mention = await _db.Mentions.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == claim.MentionId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Mention {claim.MentionId} for claim {claim.Id} not found.");
        var answer = await _db.AIAnswers.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == mention.AIAnswerId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"AIAnswer {mention.AIAnswerId} for claim {claim.Id} not found.");
        var promptRun = await _db.PromptRuns.AsNoTracking()
            .FirstOrDefaultAsync(pr => pr.Id == answer.PromptRunId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"PromptRun {answer.PromptRunId} for claim {claim.Id} not found.");
        var scan = await _db.ScanRuns.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == promptRun.ScanRunId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"ScanRun {promptRun.ScanRunId} for claim {claim.Id} not found.");
        var tracker = await _db.TrackerConfigurations.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == scan.TrackerConfigurationId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Tracker {scan.TrackerConfigurationId} for claim {claim.Id} not found.");
        var brand = await _db.Brands.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == tracker.BrandId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Brand {tracker.BrandId} for claim {claim.Id} not found.");

        if (brand.WorkspaceId != _workspace.WorkspaceId)
            throw new InvalidOperationException(
                $"Factual claim {claim.Id} does not belong to the current workspace.");

        // Same-value writes are no-ops but still complete cleanly — the
        // FE may re-fire the same status if the user toggles a button
        // without intent to change.
        if (claim.ReviewStatus != request.ReviewStatus)
        {
            claim.ReviewStatus = request.ReviewStatus;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return new UpdateFactualClaimReviewStatusResult(claim.ReviewStatus);
    }
}
