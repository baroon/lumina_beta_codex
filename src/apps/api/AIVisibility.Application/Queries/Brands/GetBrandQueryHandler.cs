using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Brands;

public class GetBrandQueryHandler : IRequestHandler<GetBrandQuery, BrandDto?>
{
    private readonly IAppDbContext _db;

    public GetBrandQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<BrandDto?> Handle(GetBrandQuery request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands
            .Include(b => b.DiscoveryRuns)
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken);

        if (brand == null) return null;

        var latestRun = brand.DiscoveryRuns
            .OrderByDescending(r => r.StartedAt)
            .FirstOrDefault();

        return new BrandDto(
            brand.Id,
            brand.Name,
            brand.WebsiteUrl,
            brand.CreatedAt,
            latestRun != null
                ? new LatestDiscoveryDto(
                    latestRun.Id,
                    latestRun.Status.ToString(),
                    latestRun.PagesCrawled,
                    latestRun.StartedAt,
                    latestRun.CompletedAt)
                : null);
    }
}
