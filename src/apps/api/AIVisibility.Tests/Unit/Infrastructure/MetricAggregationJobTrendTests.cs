using AIVisibility.Application;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

/// <summary>
/// MetricAggregationJob trend-point write tests (Phase 4 Slice 6). The
/// aggregation job derives + persists 6 trend points per scan: the 4 rate
/// metrics + AverageBrandRank (from Overall-scope ScanMetric rows), the
/// FE-derived OwnedCitationShare (owned/total), and the categorical
/// OverallSentiment (mode of BrandSentimentDistribution).
/// </summary>
public class MetricAggregationJobTrendTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid AnalysisJobId, Guid ScanRunId, Guid TrackerId, DateTime CompletedAt);

    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Lumina" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var completedAt = DateTime.UtcNow.AddMinutes(-1);
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow.AddMinutes(-10), CompletedAt = completedAt,
        };
        var job = new AnalysisJob
        {
            Id = Guid.NewGuid(), ScanRunId = scan.Id,
            Status = AnalysisJobStatus.Queued, CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);
        ctx.AnalysisJobs.Add(job);
        ctx.SaveChanges();
        return new Seed(job.Id, scan.Id, tracker.Id, completedAt);
    }

    /// <summary>
    /// Builds an in-memory MetricAggregator stub by injecting a real one against
    /// the same context — but seed ScanMetric rows the aggregator would normally
    /// produce. Since the aggregator computes from extracted signals, simpler to
    /// short-circuit by stubbing the aggregator to a precomputed list.
    /// </summary>
    private sealed class StubAggregator : MetricAggregator
    {
        private readonly List<ScanMetric> _rows;
        public StubAggregator(IList<ScanMetric> rows, AppDbContext ctx)
            : base(ctx, new Mock<ILogger<MetricAggregator>>().Object)
        {
            _rows = rows.ToList();
        }
        public override Task<List<ScanMetric>> ComputeAsync(Guid scanRunId, CancellationToken ct) =>
            Task.FromResult(_rows);
    }

    [Fact]
    public async Task WritesOneTrendPointPerDashboardMetric()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // Seed the 5 Overall-scope ScanMetric rows the aggregator would emit
        // and the 2 BrandSentimentDistribution rows. Stub aggregator returns
        // the full list; job derives trend points from it.
        var aggregatorOutput = new List<ScanMetric>
        {
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.BrandMentionRate, MetricValue = 0.4, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.BrandRecommendationRate, MetricValue = 0.15, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.BrandShareOfVoice, MetricValue = 0.6, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.AverageBrandRank, MetricValue = 2.5, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.CitationCount, MetricValue = 10, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.OwnedCitationCount, MetricValue = 4, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.BrandSentimentDistribution, MetricValue = 6, MetadataJson = "{\"value\":\"Positive\"}", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.BrandSentimentDistribution, MetricValue = 2, MetadataJson = "{\"value\":\"Neutral\"}", CreatedAt = DateTime.UtcNow },
        };
        var stub = new StubAggregator(aggregatorOutput, ctx);
        var job = new MetricAggregationJob(ctx, stub, new Mock<ILogger<MetricAggregationJob>>().Object);

        await job.AggregateAsync(seed.AnalysisJobId, CancellationToken.None);

        var points = await ctx.TrendPoints.AsNoTracking()
            .Where(p => p.TrackerConfigurationId == seed.TrackerId)
            .ToListAsync();

        // 6 trend points: 4 rates + AverageBrandRank + OwnedCitationShare + OverallSentiment = 7 actually.
        // Wait — let me recount: BrandMentionRate, BrandRecommendationRate, BrandShareOfVoice,
        // AverageBrandRank, OwnedCitationShare, OverallSentiment = 6.
        points.Should().HaveCount(6);
        points.Should().AllSatisfy(p => p.CapturedAt.Should().BeCloseTo(seed.CompletedAt, TimeSpan.FromSeconds(1)));

        points.Single(p => p.MetricName == MetricNames.BrandMentionRate).NumericValue.Should().BeApproximately(0.4, 1e-9);
        points.Single(p => p.MetricName == MetricNames.BrandRecommendationRate).NumericValue.Should().BeApproximately(0.15, 1e-9);
        points.Single(p => p.MetricName == MetricNames.BrandShareOfVoice).NumericValue.Should().BeApproximately(0.6, 1e-9);
        points.Single(p => p.MetricName == MetricNames.AverageBrandRank).NumericValue.Should().BeApproximately(2.5, 1e-9);

        // OwnedCitationShare = 4 / 10 = 0.4
        var ownedShare = points.Single(p => p.MetricName == "OwnedCitationShare");
        ownedShare.NumericValue.Should().BeApproximately(0.4, 1e-9);

        // OverallSentiment mode = Positive (count=6 > Neutral count=2)
        var sentiment = points.Single(p => p.MetricName == "OverallSentiment");
        sentiment.CategoricalValue.Should().Be("Positive");
        sentiment.NumericValue.Should().BeNull();
    }

    [Fact]
    public async Task EmitsNullOwnedShare_WhenCitationCountIsZero()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var aggregatorOutput = new List<ScanMetric>
        {
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.CitationCount, MetricValue = 0, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.OwnedCitationCount, MetricValue = 0, CreatedAt = DateTime.UtcNow },
        };
        var stub = new StubAggregator(aggregatorOutput, ctx);
        var job = new MetricAggregationJob(ctx, stub, new Mock<ILogger<MetricAggregationJob>>().Object);

        await job.AggregateAsync(seed.AnalysisJobId, CancellationToken.None);

        var ownedShare = await ctx.TrendPoints.AsNoTracking()
            .SingleAsync(p => p.TrackerConfigurationId == seed.TrackerId && p.MetricName == "OwnedCitationShare");
        ownedShare.NumericValue.Should().BeNull();
    }

    [Fact]
    public async Task EmitsNullCategoricalSentiment_WhenDistributionIsEmpty()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var aggregatorOutput = new List<ScanMetric>
        {
            // No BrandSentimentDistribution rows.
            new() { Id = Guid.NewGuid(), ScanRunId = seed.ScanRunId, Scope = ScanMetricScope.Overall, MetricName = MetricNames.CitationCount, MetricValue = 1, CreatedAt = DateTime.UtcNow },
        };
        var stub = new StubAggregator(aggregatorOutput, ctx);
        var job = new MetricAggregationJob(ctx, stub, new Mock<ILogger<MetricAggregationJob>>().Object);

        await job.AggregateAsync(seed.AnalysisJobId, CancellationToken.None);

        var sentiment = await ctx.TrendPoints.AsNoTracking()
            .SingleAsync(p => p.TrackerConfigurationId == seed.TrackerId && p.MetricName == "OverallSentiment");
        sentiment.CategoricalValue.Should().BeNull();
        sentiment.NumericValue.Should().BeNull();
    }
}
