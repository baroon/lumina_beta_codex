using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetLensCountsQueryHandler
    : IRequestHandler<GetLensCountsQuery, IReadOnlyList<LensCountDto>>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetLensCountsQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<LensCountDto>> Handle(
        GetLensCountsQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        // Workspace scope: brands → trackers.
        var trackerIds = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => _db.Brands.Any(b => b.Id == t.BrandId && b.WorkspaceId == workspaceId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        // Always echo every lens — even ones with zero mentions — so the
        // selector can mark them as empty. Start with all lenses then
        // left-join the per-lens mention count.
        var allLenses = await _db.Lenses.AsNoTracking()
            .OrderBy(l => l.DisplayOrder)
            .Select(l => new { l.Id, l.Code })
            .ToListAsync(cancellationToken);

        if (trackerIds.Count == 0)
        {
            return allLenses.Select(l => new LensCountDto(l.Code, 0)).ToList();
        }

        // Mentions joined back through answer → prompt run → prompt → lens
        // so we can group by Lens.Id. The window predicate matches the
        // overview handlers (ScanRun.StartedAt) so the counts line up
        // exactly with what the lens filter would show.
        var countsByLensId = await (
            from m in _db.Mentions.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join p in _db.Prompts.AsNoTracking() on pr.PromptId equals p.Id
            where trackerIds.Contains(s.TrackerConfigurationId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            group m by p.LensId into g
            select new { LensId = g.Key, Count = g.Count() }
        ).ToDictionaryAsync(x => x.LensId, x => x.Count, cancellationToken);

        return allLenses
            .Select(l => new LensCountDto(
                l.Code,
                countsByLensId.TryGetValue(l.Id, out var n) ? n : 0))
            .ToList();
    }
}
