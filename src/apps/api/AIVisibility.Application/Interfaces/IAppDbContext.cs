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
    DbSet<TrackerConfiguration> TrackerConfigurations { get; }
    DbSet<VisibilityCheck> VisibilityChecks { get; }
    DbSet<TrackerTopic> TrackerTopics { get; }
    DbSet<TrackerVisibilityCheck> TrackerVisibilityChecks { get; }
    DbSet<TrackerCompetitor> TrackerCompetitors { get; }
    DbSet<TrackerProduct> TrackerProducts { get; }
    DbSet<TrackerAudience> TrackerAudiences { get; }
    DbSet<TrackerMarket> TrackerMarkets { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
