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
    public DbSet<Lens> Lenses => Set<Lens>();
    public DbSet<TrackerTopic> TrackerTopics => Set<TrackerTopic>();
    public DbSet<TrackerLens> TrackerLenses => Set<TrackerLens>();
    public DbSet<TrackerCompetitor> TrackerCompetitors => Set<TrackerCompetitor>();
    public DbSet<TrackerProduct> TrackerProducts => Set<TrackerProduct>();
    public DbSet<TrackerAudience> TrackerAudiences => Set<TrackerAudience>();
    public DbSet<TrackerMarket> TrackerMarkets => Set<TrackerMarket>();
    public DbSet<PromptTemplate> PromptTemplates => Set<PromptTemplate>();
    public DbSet<Prompt> Prompts => Set<Prompt>();
    public DbSet<PromptTopic> PromptTopics => Set<PromptTopic>();
    public DbSet<PromptCompetitor> PromptCompetitors => Set<PromptCompetitor>();
    public DbSet<PromptProduct> PromptProducts => Set<PromptProduct>();
    public DbSet<PromptAudience> PromptAudiences => Set<PromptAudience>();
    public DbSet<PromptMarket> PromptMarkets => Set<PromptMarket>();
    public DbSet<AIPlatform> AIPlatforms => Set<AIPlatform>();
    public DbSet<TrackerPlatform> TrackerPlatforms => Set<TrackerPlatform>();
    public DbSet<ScanRun> ScanRuns => Set<ScanRun>();
    public DbSet<PromptRun> PromptRuns => Set<PromptRun>();
    public DbSet<AIAnswer> AIAnswers => Set<AIAnswer>();
    public DbSet<AnalysisJob> AnalysisJobs => Set<AnalysisJob>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
