using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Prompts;

public class ListPromptsQueryHandler : IRequestHandler<ListPromptsQuery, PromptListDto?>
{
    private readonly IAppDbContext _db;

    public ListPromptsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<PromptListDto?> Handle(ListPromptsQuery request, CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations
            .FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken);
        if (tracker == null) return null;

        // Non-archived prompts only (Draft + Active).
        var prompts = await _db.Prompts
            .Where(p => p.TrackerConfigurationId == tracker.Id && p.Status != PromptStatus.Archived)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var checkNames = await _db.VisibilityChecks
            .ToDictionaryAsync(v => v.Id, v => v.Name, cancellationToken);

        var topicIds = prompts
            .Where(p => p.PrimaryTopicId.HasValue)
            .Select(p => p.PrimaryTopicId!.Value)
            .Distinct()
            .ToList();
        var topicNames = await _db.Topics
            .Where(t => topicIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name, cancellationToken);

        var dtos = prompts
            .Select(p => new PromptDto(
                p.Id,
                p.PromptText,
                p.Status.ToString(),
                p.Source.ToString(),
                p.VisibilityCheckId,
                checkNames.TryGetValue(p.VisibilityCheckId, out var cn) ? cn : string.Empty,
                p.PrimaryTopicId,
                p.PrimaryTopicId.HasValue && topicNames.TryGetValue(p.PrimaryTopicId.Value, out var tn) ? tn : null))
            .ToList();

        return new PromptListDto(tracker.PromptAllocation, dtos.Count, dtos);
    }
}
