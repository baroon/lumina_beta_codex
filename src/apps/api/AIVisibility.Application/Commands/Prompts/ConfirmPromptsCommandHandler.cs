using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Prompts;

public class ConfirmPromptsCommandHandler : IRequestHandler<ConfirmPromptsCommand, ConfirmPromptsResult>
{
    private readonly IAppDbContext _db;

    public ConfirmPromptsCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ConfirmPromptsResult> Handle(ConfirmPromptsCommand request, CancellationToken cancellationToken)
    {
        var tracker =
            await _db.TrackerConfigurations.FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken)
            ?? throw new InvalidOperationException($"Tracker {request.TrackerId} not found.");

        var drafts = await _db.Prompts
            .Where(p => p.TrackerConfigurationId == tracker.Id && p.Status == PromptStatus.Draft)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var prompt in drafts)
        {
            prompt.Status = PromptStatus.Active;
            prompt.UpdatedAt = now;
        }

        // Sweep archived prompts with no PromptRun history. RemovePromptCommand
        // soft-archives during the review loop so GeneratePromptsCommand can
        // exclude them on regenerate — at Confirm time the loop is over, the
        // exclusion marker has served its purpose, and the user shouldn't see
        // Archived ghosts sitting beside the Active rows for this tracker
        // (deferred-work doc surface complaint). Once a PromptRun exists we
        // keep the archived row so Mention / Citation history stays
        // attributable — the five M:N rows cascade-delete via EF convention.
        var archivedNoHistory = await _db.Prompts
            .Where(p => p.TrackerConfigurationId == tracker.Id
                     && p.Status == PromptStatus.Archived
                     && !_db.PromptRuns.Any(r => r.PromptId == p.Id))
            .ToListAsync(cancellationToken);
        _db.Prompts.RemoveRange(archivedNoHistory);

        await _db.SaveChangesAsync(cancellationToken);
        return new ConfirmPromptsResult(drafts.Count);
    }
}
