using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetTopicCountsQueryHandler
    : IRequestHandler<GetTopicCountsQuery, IReadOnlyList<TopicCountDto>>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetTopicCountsQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<TopicCountDto>> Handle(
        GetTopicCountsQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        var brandIds = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        // Distinct topic names across the workspace's brands. Each name
        // may exist as multiple Topic rows (per-brand / per-DiscoveryRun);
        // we want one chip row per distinct name regardless.
        var rawNames = await _db.Topics.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => t.Name)
            .ToListAsync(cancellationToken);
        var allTopicNames = rawNames
            .GroupBy(n => n, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var trackerIds = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        if (trackerIds.Count == 0 || allTopicNames.Count == 0)
        {
            return allTopicNames.Select(n => new TopicCountDto(n, 0)).ToList();
        }

        // Mentions joined back through answer → prompt → prompt_topics →
        // topic so we can group by Topic.Name. The window predicate
        // matches the overview handlers so the chip number lines up with
        // the data the topic filter would surface.
        var rawCounts = await (
            from m in _db.Mentions.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join pt in _db.PromptTopics.AsNoTracking() on pr.PromptId equals pt.PromptId
            join t in _db.Topics.AsNoTracking() on pt.TopicId equals t.Id
            where trackerIds.Contains(s.TrackerConfigurationId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            group m by t.Name into g
            select new { Name = g.Key, Count = g.Count() }
        ).ToListAsync(cancellationToken);

        var countByName = rawCounts
            .GroupBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.Count), StringComparer.OrdinalIgnoreCase);

        return allTopicNames
            .Select(n => new TopicCountDto(n, countByName.TryGetValue(n, out var c) ? c : 0))
            .ToList();
    }
}
