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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
