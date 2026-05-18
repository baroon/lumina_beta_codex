using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<Brand> Brands { get; }
    DbSet<DiscoveryRun> DiscoveryRuns { get; }
    DbSet<CrawledPage> CrawledPages { get; }
    DbSet<BrandProfile> BrandProfiles { get; }
    DbSet<Product> Products { get; }
    DbSet<Audience> Audiences { get; }
    DbSet<Market> Markets { get; }
    DbSet<Topic> Topics { get; }
    DbSet<Competitor> Competitors { get; }
    DbSet<TrustSignal> TrustSignals { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
