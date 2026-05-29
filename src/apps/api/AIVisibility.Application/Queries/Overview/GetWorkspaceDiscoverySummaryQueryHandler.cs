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

        var brandIds = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        if (brandIds.Count == 0)
        {
            return new DiscoverySummaryDto(
                Array.Empty<DiscoveryDimensionDto>(),
                Array.Empty<DiscoveryDimensionDto>(),
                Array.Empty<DiscoveryDimensionDto>(),
                Array.Empty<DiscoveryDimensionDto>(),
                Array.Empty<DiscoveryDimensionDto>());
        }

        // Each dimension is brand-scoped (and even per-DiscoveryRun within
        // a brand). A workspace with multiple brands — or a brand that was
        // discovered repeatedly — produces the same logical dimension
        // multiple times (e.g. "United States" market appearing once per
        // brand). Dedup by name (case-insensitive) in-memory so the strip
        // shows one row per distinct dimension. Names ride along so the
        // FE popover can list them without a second round-trip.
        var products = Dedup(await _db.Products.AsNoTracking()
            .Where(p => brandIds.Contains(p.BrandId))
            .Select(p => new DiscoveryDimensionDto(p.Id, p.Name))
            .ToListAsync(cancellationToken));
        var markets = Dedup(await _db.Markets.AsNoTracking()
            .Where(m => brandIds.Contains(m.BrandId))
            .Select(m => new DiscoveryDimensionDto(m.Id, m.Name))
            .ToListAsync(cancellationToken));
        var audiences = Dedup(await _db.Audiences.AsNoTracking()
            .Where(a => brandIds.Contains(a.BrandId))
            .Select(a => new DiscoveryDimensionDto(a.Id, a.Name))
            .ToListAsync(cancellationToken));
        var topics = Dedup(await _db.Topics.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => new DiscoveryDimensionDto(t.Id, t.Name))
            .ToListAsync(cancellationToken));
        var trustSignals = Dedup(await _db.TrustSignals.AsNoTracking()
            .Where(ts => brandIds.Contains(ts.BrandId))
            .Select(ts => new DiscoveryDimensionDto(ts.Id, ts.Name))
            .ToListAsync(cancellationToken));

        return new DiscoverySummaryDto(products, markets, audiences, topics, trustSignals);
    }

    /// <summary>
    /// Collapse rows that share a name (case-insensitive) to a single
    /// representative DTO and sort alphabetically. Trimmed for the chip
    /// strip's "Tracking N …" use case where we want a workspace-wide
    /// distinct list, not the underlying per-brand rows.
    /// </summary>
    private static IReadOnlyList<DiscoveryDimensionDto> Dedup(
        IEnumerable<DiscoveryDimensionDto> rows) =>
        rows
            .GroupBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
}
