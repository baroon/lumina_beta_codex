using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Infrastructure.Data;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<DiscoveryRun> DiscoveryRuns => Set<DiscoveryRun>();
    public DbSet<CrawledPage> CrawledPages => Set<CrawledPage>();
    public DbSet<BrandProfile> BrandProfiles => Set<BrandProfile>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Audience> Audiences => Set<Audience>();
    public DbSet<Market> Markets => Set<Market>();
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<Competitor> Competitors => Set<Competitor>();
    public DbSet<TrustSignal> TrustSignals => Set<TrustSignal>();
    public DbSet<TrackerConfiguration> TrackerConfigurations => Set<TrackerConfiguration>();
    public DbSet<VisibilityCheck> VisibilityChecks => Set<VisibilityCheck>();
    public DbSet<TrackerTopic> TrackerTopics => Set<TrackerTopic>();
    public DbSet<TrackerVisibilityCheck> TrackerVisibilityChecks => Set<TrackerVisibilityCheck>();
    public DbSet<TrackerCompetitor> TrackerCompetitors => Set<TrackerCompetitor>();
    public DbSet<TrackerProduct> TrackerProducts => Set<TrackerProduct>();
    public DbSet<TrackerAudience> TrackerAudiences => Set<TrackerAudience>();
    public DbSet<TrackerMarket> TrackerMarkets => Set<TrackerMarket>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
