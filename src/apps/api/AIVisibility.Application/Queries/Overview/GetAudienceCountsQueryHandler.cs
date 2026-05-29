using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetAudienceCountsQueryHandler
    : IRequestHandler<GetAudienceCountsQuery, IReadOnlyList<AudienceCountDto>>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetAudienceCountsQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<AudienceCountDto>> Handle(
        GetAudienceCountsQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        var brandIds = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        var rawNames = await _db.Audiences.AsNoTracking()
            .Where(a => brandIds.Contains(a.BrandId))
            .Select(a => a.Name)
            .ToListAsync(cancellationToken);
        var allAudienceNames = rawNames
            .GroupBy(n => n, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var trackerIds = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        if (trackerIds.Count == 0 || allAudienceNames.Count == 0)
        {
            return allAudienceNames.Select(n => new AudienceCountDto(n, 0)).ToList();
        }

        var rawCounts = await (
            from m in _db.Mentions.AsNoTracking()
            join ans in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals ans.Id
            join pr in _db.PromptRuns.AsNoTracking() on ans.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join pa in _db.PromptAudiences.AsNoTracking() on pr.PromptId equals pa.PromptId
            join a in _db.Audiences.AsNoTracking() on pa.AudienceId equals a.Id
            where trackerIds.Contains(s.TrackerConfigurationId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            group m by a.Name into g
            select new { Name = g.Key, Count = g.Count() }
        ).ToListAsync(cancellationToken);

        var countByName = rawCounts
            .GroupBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.Count), StringComparer.OrdinalIgnoreCase);

        return allAudienceNames
            .Select(n => new AudienceCountDto(n, countByName.TryGetValue(n, out var c) ? c : 0))
            .ToList();
    }
}
