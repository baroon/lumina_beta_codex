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

        // Coverage options for the add-custom + regenerate-by UI.
        var coverageCheckIds = await _db.TrackerVisibilityChecks
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.VisibilityCheckId)
            .ToListAsync(cancellationToken);
        var checks = await _db.VisibilityChecks
            .Where(v => coverageCheckIds.Contains(v.Id))
            .OrderBy(v => v.DisplayOrder)
            .Select(v => new PromptOptionDto(v.Id, v.Name))
            .ToListAsync(cancellationToken);

        var coverageTopicIds = await _db.TrackerTopics
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.TopicId)
            .ToListAsync(cancellationToken);
        var topicOptions = await _db.Topics
            .Where(t => coverageTopicIds.Contains(t.Id))
            .OrderBy(t => t.Name)
            .Select(t => new PromptOptionDto(t.Id, t.Name))
            .ToListAsync(cancellationToken);

        // Review flags: a check whose template needs a dimension the tracker is missing
        // (e.g. Competitor Comparison with no competitors) yields generic prompts → flag them.
        var promptCheckIds = prompts.Select(p => p.VisibilityCheckId).Distinct().ToList();
        var checkNeeds = (await _db.PromptTemplates
            .Where(t => promptCheckIds.Contains(t.VisibilityCheckId))
            .Select(t => new { t.VisibilityCheckId, t.TemplateText })
            .ToListAsync(cancellationToken))
            .GroupBy(t => t.VisibilityCheckId)
            .ToDictionary(
                g => g.Key,
                g => (
                    NeedsTopic: g.Any(x => x.TemplateText.Contains("{topic}")),
                    NeedsCompetitor: g.Any(x => x.TemplateText.Contains("{competitor}"))));
        var competitorCount = await _db.TrackerCompetitors
            .CountAsync(x => x.TrackerConfigurationId == tracker.Id, cancellationToken);
        var topicCount = coverageTopicIds.Count;

        string? ReviewReason(Guid checkId)
        {
            if (!checkNeeds.TryGetValue(checkId, out var needs)) return null;
            if (needs.NeedsCompetitor && competitorCount == 0)
                return "No competitors configured to compare against.";
            if (needs.NeedsTopic && topicCount == 0)
                return "No topics configured for this check.";
            return null;
        }

        var dtos = prompts
            .Select(p => new PromptDto(
                p.Id,
                p.PromptText,
                p.Status.ToString(),
                p.Source.ToString(),
                p.VisibilityCheckId,
                checkNames.TryGetValue(p.VisibilityCheckId, out var cn) ? cn : string.Empty,
                p.PrimaryTopicId,
                p.PrimaryTopicId.HasValue && topicNames.TryGetValue(p.PrimaryTopicId.Value, out var tn)
                    ? tn
                    : null,
                ReviewReason(p.VisibilityCheckId)))
            .ToList();

        return new PromptListDto(tracker.PromptAllocation, dtos.Count, dtos, checks, topicOptions);
    }
}
