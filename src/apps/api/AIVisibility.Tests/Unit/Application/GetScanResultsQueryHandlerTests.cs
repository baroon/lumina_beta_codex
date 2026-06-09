using AIVisibility.Application.Queries.Scans;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetScanResultsQueryHandler tests. Seeds a ScanRun + AnalysisJob + a
/// representative set of ScanMetric rows (one of each metric_name at each
/// scope) and asserts the handler pivots them correctly into the DTO tree.
/// Aggregator math is covered separately in MetricAggregatorTests; these
/// tests focus on the read-model shape.
/// </summary>
public class GetScanResultsQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Fixture(
        Guid ScanRunId, Guid TrackerId, Guid BrandId,
        Guid PlatformId, Guid LensId, Guid TopicId,
        Guid TrackedCompetitorId, Guid UntouchedCompetitorId);

    private static Fixture Seed(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Lumina", WebsiteUrl = "https://lumina.io",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = "Lumina Visibility Tracker", Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow,
        };
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "OpenAI", DisplayOrder = 1 };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "Discovery", Name = "Discovery" };
        var topic = new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Sustainable Design", Confidence = 0.9 };
        var trackedComp = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Acme", Domain = "acme.com" };
        var untouchedComp = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Beta", Domain = "beta.com" };

        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.AIPlatforms.Add(platform);
        ctx.Lenses.Add(lens);
        ctx.Topics.Add(topic);
        ctx.Competitors.Add(trackedComp);
        ctx.Competitors.Add(untouchedComp);

        ctx.TrackerPlatforms.Add(new TrackerPlatform
        {
            TrackerConfigurationId = tracker.Id, AIPlatformId = platform.Id,
        });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor
        {
            TrackerConfigurationId = tracker.Id, CompetitorId = trackedComp.Id,
        });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor
        {
            TrackerConfigurationId = tracker.Id, CompetitorId = untouchedComp.Id,
        });

        var scan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            ScanCheckCount = 30, CompletedCount = 30, FailedCount = 0,
            StartedAt = DateTime.UtcNow.AddMinutes(-5), CompletedAt = DateTime.UtcNow,
        };
        ctx.ScanRuns.Add(scan);

        ctx.AnalysisJobs.Add(new AnalysisJob
        {
            Id = Guid.NewGuid(), ScanRunId = scan.Id,
            Status = AnalysisJobStatus.Completed,
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            ExtractStartedAt = DateTime.UtcNow.AddMinutes(-4),
            ExtractCompletedAt = DateTime.UtcNow.AddMinutes(-3),
            AggregateStartedAt = DateTime.UtcNow.AddMinutes(-3),
            AggregateCompletedAt = DateTime.UtcNow.AddMinutes(-2),
        });

        ctx.SaveChanges();
        return new Fixture(scan.Id, tracker.Id, brand.Id, platform.Id, lens.Id, topic.Id,
            trackedComp.Id, untouchedComp.Id);
    }

    private static void AddMetric(AppDbContext ctx, Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        string name, double value, string? metadataJson = null)
    {
        ctx.ScanMetrics.Add(new ScanMetric
        {
            Id = Guid.NewGuid(),
            ScanRunId = scanRunId,
            Scope = scope,
            ScopeId = scopeId,
            MetricName = name,
            MetricValue = value,
            MetadataJson = metadataJson,
            CreatedAt = DateTime.UtcNow,
        });
    }

    [Fact]
    public async Task ReturnsNull_WhenScanMissing()
    {
        using var ctx = NewContext();
        var sut = new GetScanResultsQueryHandler(ctx);

        var result = await sut.Handle(new GetScanResultsQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNull_WhenAnalysisJobMissing()
    {
        // ScanRun exists but the AnalysisJob row hasn't been created — happens
        // pre-Slice-1, but also if reporting reads a freshly-triggered scan
        // before ScanExecutor inserts the AnalysisJob. The handler returns
        // null so the controller maps to 404 rather than half-populating a DTO.
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T",
            Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Running,
            StartedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);
        await ctx.SaveChangesAsync();

        var result = await new GetScanResultsQueryHandler(ctx)
            .Handle(new GetScanResultsQuery(scan.Id), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task PopulatesSummary_FromScanRunAndAnalysisJob()
    {
        using var ctx = NewContext();
        var fx = Seed(ctx);

        var result = await new GetScanResultsQueryHandler(ctx)
            .Handle(new GetScanResultsQuery(fx.ScanRunId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Summary.BrandName.Should().Be("Lumina");
        result.Summary.TrackerName.Should().Be("Lumina Visibility Tracker");
        result.Summary.ScanStatus.Should().Be("Completed");
        result.Summary.AnalysisStatus.Should().Be("Completed");
        result.Summary.ScanCheckCount.Should().Be(30);
        result.Summary.Platforms.Should().ContainSingle(p => p.PlatformId == fx.PlatformId && p.Name == "OpenAI");
    }

    [Fact]
    public async Task PivotsOverallScopeIntoCoreMetrics()
    {
        using var ctx = NewContext();
        var fx = Seed(ctx);

        // Seed an Overall-scope metric row of each kind.
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "BrandMentionRate", 0.4);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "BrandRecommendationRate", 0.2);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "BrandShareOfVoice", 0.6);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "AverageBrandRank", 2.5);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "CompetitorMentionCount", 7);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "ProductMentionCount", 2);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "CitationCount", 9);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "OwnedCitationCount", 2);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "CompetitorCitationCount", 3);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "ThirdPartyCitationCount", 3);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "UnknownCitationCount", 1);
        // Sentiment distribution rows (the aggregator emits one per observed value).
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null,
            "BrandSentimentDistribution", 6, @"{""value"":""Positive""}");
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null,
            "BrandSentimentDistribution", 4, @"{""value"":""Neutral""}");
        // Top cited sources.
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null,
            "TopCitedSource", 5, @"{""source_name"":""Trustpilot"",""rank"":1}");
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null,
            "TopCitedSource", 3, @"{""source_name"":""G2"",""rank"":2}");
        await ctx.SaveChangesAsync();

        var result = await new GetScanResultsQueryHandler(ctx)
            .Handle(new GetScanResultsQuery(fx.ScanRunId), CancellationToken.None);

        result!.CoreMetrics.BrandMentionRate.Should().BeApproximately(0.4, 1e-9);
        result.CoreMetrics.BrandShareOfVoice.Should().BeApproximately(0.6, 1e-9);
        result.CoreMetrics.AverageBrandRank.Should().BeApproximately(2.5, 1e-9);
        result.CoreMetrics.CitationCount.Should().Be(9);
        result.CoreMetrics.UnknownCitationCount.Should().Be(1);
        result.CoreMetrics.BrandSentimentDistribution.Should()
            .ContainKey("Positive").WhoseValue.Should().Be(6);
        result.CoreMetrics.BrandSentimentDistribution.Should()
            .ContainKey("Neutral").WhoseValue.Should().Be(4);
        result.CoreMetrics.TopCitedSources.Should().HaveCount(2);
        result.CoreMetrics.TopCitedSources[0].Rank.Should().Be(1);
        result.CoreMetrics.TopCitedSources[0].SourceName.Should().Be("Trustpilot");
        result.CoreMetrics.TopCitedSources[0].CitationCount.Should().Be(5);
        result.CoreMetrics.TopCitedSources[1].Rank.Should().Be(2);
    }

    [Fact]
    public async Task ReturnsNullableMetrics_AsNull_WhenMissing()
    {
        // Aggregator skips e.g. AverageBrandRank when no signal has a rank, and
        // BrandShareOfVoice when no brand or competitor mentions. The DTO must
        // surface these as null, not as 0 (0 would be a real "no recommendations"
        // signal versus "no data").
        using var ctx = NewContext();
        var fx = Seed(ctx);
        // Only seed a few metrics; rates absent.
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Overall, null, "CitationCount", 0);
        await ctx.SaveChangesAsync();

        var result = await new GetScanResultsQueryHandler(ctx)
            .Handle(new GetScanResultsQuery(fx.ScanRunId), CancellationToken.None);

        result!.CoreMetrics.BrandMentionRate.Should().BeNull();
        result.CoreMetrics.BrandShareOfVoice.Should().BeNull();
        result.CoreMetrics.AverageBrandRank.Should().BeNull();
        result.CoreMetrics.CitationCount.Should().Be(0);  // explicit 0 is not the same as null
    }

    [Fact]
    public async Task PivotsPlatformAndLensAndTopicScopesIntoBreakdowns()
    {
        using var ctx = NewContext();
        var fx = Seed(ctx);

        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Platform, fx.PlatformId, "BrandMentionRate", 0.5);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Platform, fx.PlatformId, "BrandShareOfVoice", 0.7);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Platform, fx.PlatformId, "CitationCount", 4);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Platform, fx.PlatformId,
            "BrandSentimentDistribution", 3, @"{""value"":""Positive""}");

        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Lens, fx.LensId, "BrandMentionRate", 0.6);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Lens, fx.LensId, "CitationCount", 2);

        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Topic, fx.TopicId, "BrandMentionRate", 0.8);
        await ctx.SaveChangesAsync();

        var result = await new GetScanResultsQueryHandler(ctx)
            .Handle(new GetScanResultsQuery(fx.ScanRunId), CancellationToken.None);

        result!.Breakdowns.ByPlatform.Should().ContainSingle();
        var plat = result.Breakdowns.ByPlatform[0];
        plat.PlatformName.Should().Be("OpenAI");
        plat.BrandMentionRate.Should().BeApproximately(0.5, 1e-9);
        plat.BrandShareOfVoice.Should().BeApproximately(0.7, 1e-9);
        plat.CitationCount.Should().Be(4);
        plat.BrandSentimentDistribution.Should().ContainKey("Positive").WhoseValue.Should().Be(3);

        result.Breakdowns.ByLens.Should().ContainSingle(l => l.LensName == "Discovery");
        result.Breakdowns.ByTopic.Should().ContainSingle(t => t.TopicName == "Sustainable Design");
        result.Breakdowns.ByTopic[0].BrandMentionRate.Should().BeApproximately(0.8, 1e-9);
    }

    [Fact]
    public async Task ByCompetitor_IncludesEveryTrackedCompetitor_EvenWhenUnmentioned()
    {
        // Reporting needs to render "tracked but not mentioned" entries
        // explicitly — they're a strong signal. The aggregator only emits
        // Competitor-scope rows for mentioned competitors, so the handler
        // back-fills 0s for the rest from the TrackerCompetitor list.
        using var ctx = NewContext();
        var fx = Seed(ctx);

        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Competitor, fx.TrackedCompetitorId, "MentionCount", 5);
        AddMetric(ctx, fx.ScanRunId, ScanMetricScope.Competitor, fx.TrackedCompetitorId, "RecommendationCount", 2);
        // UntouchedCompetitorId has no metric rows — handler should still surface it.
        await ctx.SaveChangesAsync();

        var result = await new GetScanResultsQueryHandler(ctx)
            .Handle(new GetScanResultsQuery(fx.ScanRunId), CancellationToken.None);

        result!.Breakdowns.ByCompetitor.Should().HaveCount(2);
        var acme = result.Breakdowns.ByCompetitor.Single(c => c.CompetitorName == "Acme");
        acme.MentionCount.Should().Be(5);
        acme.RecommendationCount.Should().Be(2);
        var beta = result.Breakdowns.ByCompetitor.Single(c => c.CompetitorName == "Beta");
        beta.MentionCount.Should().Be(0);
        beta.RecommendationCount.Should().Be(0);
    }
}
