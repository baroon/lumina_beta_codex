using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetWorkspaceDiscoverySummaryQueryHandler
    : IRequestHandler<GetWorkspaceDiscoverySummaryQuery, DiscoverySummaryDto>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetWorkspaceDiscoverySummaryQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<DiscoverySummaryDto> Handle(
        GetWorkspaceDiscoverySummaryQuery request, CancellationToken cancellationToken)
    {
        var workspaceId = _workspace.WorkspaceId;

        var brands = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => new { b.Id, b.Name })
            .ToListAsync(cancellationToken);

        if (brands.Count == 0)
        {
            return new DiscoverySummaryDto(
                Array.Empty<BrandedDimensionGroupDto>(),
                Array.Empty<BrandedDimensionGroupDto>(),
                Array.Empty<BrandedDimensionGroupDto>(),
                Array.Empty<BrandedDimensionGroupDto>(),
                Array.Empty<BrandedDimensionGroupDto>());
        }

        var brandIds = brands.Select(b => b.Id).ToList();
        var brandNameById = brands.ToDictionary(b => b.Id, b => b.Name);

        var products = await LoadGroupsAsync(
            _db.Products.AsNoTracking()
                .Where(p => brandIds.Contains(p.BrandId))
                .Select(p => new DimensionRow(p.Id, p.BrandId, p.Name)),
            brandNameById, cancellationToken);

        var markets = await LoadGroupsAsync(
            _db.Markets.AsNoTracking()
                .Where(m => brandIds.Contains(m.BrandId))
                .Select(m => new DimensionRow(m.Id, m.BrandId, m.Name)),
            brandNameById, cancellationToken);

        var audiences = await LoadGroupsAsync(
            _db.Audiences.AsNoTracking()
                .Where(a => brandIds.Contains(a.BrandId))
                .Select(a => new DimensionRow(a.Id, a.BrandId, a.Name)),
            brandNameById, cancellationToken);

        var topics = await LoadGroupsAsync(
            _db.Topics.AsNoTracking()
                .Where(t => brandIds.Contains(t.BrandId))
                .Select(t => new DimensionRow(t.Id, t.BrandId, t.Name)),
            brandNameById, cancellationToken);

        var trustSignals = await LoadGroupsAsync(
            _db.TrustSignals.AsNoTracking()
                .Where(ts => brandIds.Contains(ts.BrandId))
                .Select(ts => new DimensionRow(ts.Id, ts.BrandId, ts.Name)),
            brandNameById, cancellationToken);

        return new DiscoverySummaryDto(products, markets, audiences, topics, trustSignals);
    }

    /// <summary>
    /// Materialize the dimension rows, group by brand, dedupe within
    /// each brand (case-insensitive name match — the same brand
    /// discovered twice would otherwise show the same topic row twice),
    /// and sort both brands and their items alphabetically. Brands with
    /// no rows for the dimension are omitted from that dimension's list.
    /// </summary>
    private static async Task<IReadOnlyList<BrandedDimensionGroupDto>> LoadGroupsAsync(
        IQueryable<DimensionRow> rows,
        IReadOnlyDictionary<Guid, string> brandNameById,
        CancellationToken cancellationToken)
    {
        var materialized = await rows.ToListAsync(cancellationToken);
        return materialized
            .GroupBy(r => r.BrandId)
            .Select(g => new BrandedDimensionGroupDto(
                g.Key,
                brandNameById[g.Key],
                g
                    .GroupBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
                    .Select(nameGroup => nameGroup.First())
                    .OrderBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
                    .Select(r => new DiscoveryDimensionDto(r.Id, r.Name))
                    .ToList()))
            .OrderBy(g => g.BrandName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private sealed record DimensionRow(Guid Id, Guid BrandId, string Name);
}
