using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetMarketCountsQueryHandler
    : IRequestHandler<GetMarketCountsQuery, IReadOnlyList<MarketCountDto>>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetMarketCountsQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<MarketCountDto>> Handle(
        GetMarketCountsQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        var brandIds = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        var rawNames = await _db.Markets.AsNoTracking()
            .Where(m => brandIds.Contains(m.BrandId))
            .Select(m => m.Name)
            .ToListAsync(cancellationToken);
        var allMarketNames = rawNames
            .GroupBy(n => n, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var trackerIds = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        if (trackerIds.Count == 0 || allMarketNames.Count == 0)
        {
            return allMarketNames.Select(n => new MarketCountDto(n, 0)).ToList();
        }

        // Mentions joined back through answer → prompt → prompt_markets →
        // market so we can group by Market.Name. Window predicate matches
        // the overview handlers so the chip lines up with the filter.
        var rawCounts = await (
            from m in _db.Mentions.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join pm in _db.PromptMarkets.AsNoTracking() on pr.PromptId equals pm.PromptId
            join mk in _db.Markets.AsNoTracking() on pm.MarketId equals mk.Id
            where trackerIds.Contains(s.TrackerConfigurationId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            group m by mk.Name into g
            select new { Name = g.Key, Count = g.Count() }
        ).ToListAsync(cancellationToken);

        var countByName = rawCounts
            .GroupBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.Count), StringComparer.OrdinalIgnoreCase);

        return allMarketNames
            .Select(n => new MarketCountDto(n, countByName.TryGetValue(n, out var c) ? c : 0))
            .ToList();
    }
}
