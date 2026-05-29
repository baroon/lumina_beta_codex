using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetProductCountsQueryHandler
    : IRequestHandler<GetProductCountsQuery, IReadOnlyList<ProductCountDto>>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetProductCountsQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<IReadOnlyList<ProductCountDto>> Handle(
        GetProductCountsQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        var brandIds = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        var rawNames = await _db.Products.AsNoTracking()
            .Where(p => brandIds.Contains(p.BrandId))
            .Select(p => p.Name)
            .ToListAsync(cancellationToken);
        var allProductNames = rawNames
            .GroupBy(n => n, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var trackerIds = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        if (trackerIds.Count == 0 || allProductNames.Count == 0)
        {
            return allProductNames.Select(n => new ProductCountDto(n, 0)).ToList();
        }

        // Mentions joined back through answer → prompt → prompt_products →
        // product so we can group by Product.Name. The window predicate
        // matches the overview handlers so the chip lines up with what
        // the product filter would surface.
        var rawCounts = await (
            from m in _db.Mentions.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join pp in _db.PromptProducts.AsNoTracking() on pr.PromptId equals pp.PromptId
            join p in _db.Products.AsNoTracking() on pp.ProductId equals p.Id
            where trackerIds.Contains(s.TrackerConfigurationId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            group m by p.Name into g
            select new { Name = g.Key, Count = g.Count() }
        ).ToListAsync(cancellationToken);

        var countByName = rawCounts
            .GroupBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.Count), StringComparer.OrdinalIgnoreCase);

        return allProductNames
            .Select(n => new ProductCountDto(n, countByName.TryGetValue(n, out var c) ? c : 0))
            .ToList();
    }
}
