using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Brands;

public class ListBrandsQueryHandler : IRequestHandler<ListBrandsQuery, List<BrandDto>>
{
    private readonly IAppDbContext _db;

    public ListBrandsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<List<BrandDto>> Handle(ListBrandsQuery request, CancellationToken cancellationToken)
    {
        var brands = await _db.Brands
            .Include(b => b.DiscoveryRuns)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

        return brands
            .Select(brand =>
            {
                var latest = brand.DiscoveryRuns.OrderByDescending(r => r.StartedAt).FirstOrDefault();
                return new BrandDto(
                    brand.Id,
                    brand.Name,
                    brand.WebsiteUrl,
                    brand.CreatedAt,
                    latest != null
                        ? new LatestDiscoveryDto(
                            latest.Id,
                            latest.Status.ToString(),
                            latest.PagesCrawled,
                            latest.StartedAt,
                            latest.CompletedAt)
                        : null);
            })
            .ToList();
    }
}
