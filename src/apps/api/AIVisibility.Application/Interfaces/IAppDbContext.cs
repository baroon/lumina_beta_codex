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
    DbSet<Lens> Lenses { get; }
    DbSet<TrackerTopic> TrackerTopics { get; }
    DbSet<TrackerLens> TrackerLenses { get; }
    DbSet<TrackerCompetitor> TrackerCompetitors { get; }
    DbSet<TrackerProduct> TrackerProducts { get; }
    DbSet<TrackerAudience> TrackerAudiences { get; }
    DbSet<TrackerMarket> TrackerMarkets { get; }
    DbSet<PromptTemplate> PromptTemplates { get; }
    DbSet<Prompt> Prompts { get; }
    DbSet<PromptTopic> PromptTopics { get; }
    DbSet<PromptCompetitor> PromptCompetitors { get; }
    DbSet<PromptProduct> PromptProducts { get; }
    DbSet<PromptAudience> PromptAudiences { get; }
    DbSet<PromptMarket> PromptMarkets { get; }
    DbSet<AIPlatform> AIPlatforms { get; }
    DbSet<TrackerPlatform> TrackerPlatforms { get; }
    DbSet<ScanRun> ScanRuns { get; }
    DbSet<PromptRun> PromptRuns { get; }
    DbSet<AIAnswer> AIAnswers { get; }
    DbSet<AnalysisJob> AnalysisJobs { get; }
    DbSet<AnswerSignal> AnswerSignals { get; }
    DbSet<Mention> Mentions { get; }
    DbSet<MentionPair> MentionPairs { get; }
    DbSet<MentionAttribute> MentionAttributes { get; }
    DbSet<FactualClaim> FactualClaims { get; }
    DbSet<MentionCandidate> MentionCandidates { get; }
    DbSet<AnswerRecommendation> AnswerRecommendations { get; }
    DbSet<MentionRiskFlag> MentionRiskFlags { get; }
    DbSet<MentionComparison> MentionComparisons { get; }
    DbSet<MentionRecommendationContext> MentionRecommendationContexts { get; }
    DbSet<Citation> Citations { get; }
    DbSet<ScanMetric> ScanMetrics { get; }
    DbSet<Source> Sources { get; }
    DbSet<SourceUrl> SourceUrls { get; }
    DbSet<BrandSourceClassification> BrandSourceClassifications { get; }
    DbSet<SourceTypeReference> SourceTypes { get; }
    DbSet<TrendPoint> TrendPoints { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
