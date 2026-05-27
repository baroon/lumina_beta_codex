using System.Text.Json;
using AIVisibility.Application;
using AIVisibility.Application.Queries.Topics;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetScanTopicsQueryHandler tests. Pivots Topic-scope ScanMetric rows
/// into one row per topic for the list view (Phase 4 v1 plan §Slice 3).
/// </summary>
public class GetScanTopicsQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static (Guid ScanRunId, Guid TopicAId, Guid TopicBId) SeedTwoTopics(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var topicA = new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Sustainability", Confidence = 0.9 };
        var topicB = new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Urban Design", Confidence = 0.9 };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);
        ctx.Topics.Add(topicA);
        ctx.Topics.Add(topicB);

        // Topic A: high citation count, 2 sentiment buckets.
        AddMetric(ctx, scan.Id, topicA.Id, MetricNames.BrandMentionRate, 0.5);
        AddMetric(ctx, scan.Id, topicA.Id, MetricNames.BrandRecommendationRate, 0.25);
        AddMetric(ctx, scan.Id, topicA.Id, MetricNames.BrandShareOfVoice, 0.4);
        AddMetric(ctx, scan.Id, topicA.Id, MetricNames.CitationCount, 8);
        AddMetric(ctx, scan.Id, topicA.Id, MetricNames.OwnedCitationCount, 2);
        AddMetric(ctx, scan.Id, topicA.Id, MetricNames.BrandSentimentDistribution, 5, "{\"value\":\"Positive\"}");
        AddMetric(ctx, scan.Id, topicA.Id, MetricNames.BrandSentimentDistribution, 2, "{\"value\":\"Neutral\"}");

        // Topic B: lower citation count, no recommendations.
        AddMetric(ctx, scan.Id, topicB.Id, MetricNames.BrandMentionRate, 0.1);
        AddMetric(ctx, scan.Id, topicB.Id, MetricNames.CitationCount, 3);
        AddMetric(ctx, scan.Id, topicB.Id, MetricNames.OwnedCitationCount, 0);
        AddMetric(ctx, scan.Id, topicB.Id, MetricNames.BrandSentimentDistribution, 3, "{\"value\":\"Neutral\"}");

        ctx.SaveChanges();
        return (scan.Id, topicA.Id, topicB.Id);
    }

    private static void AddMetric(AppDbContext ctx, Guid scanId, Guid scopeId, string name, double value, string? metadata = null)
    {
        ctx.ScanMetrics.Add(new ScanMetric
        {
            Id = Guid.NewGuid(),
            ScanRunId = scanId,
            Scope = ScanMetricScope.Topic,
            ScopeId = scopeId,
            MetricName = name,
            MetricValue = value,
            MetadataJson = metadata,
            CreatedAt = DateTime.UtcNow,
        });
    }

    [Fact]
    public async Task ReturnsNull_WhenScanDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetScanTopicsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanTopicsQuery(Guid.NewGuid()), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task PivotsTopicMetricsIntoListRows()
    {
        using var ctx = NewContext();
        var seed = SeedTwoTopics(ctx);
        var sut = new GetScanTopicsQueryHandler(ctx);

        var result = await sut.Handle(new GetScanTopicsQuery(seed.ScanRunId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Topics.Should().HaveCount(2);

        var topicA = result.Topics.Single(t => t.TopicId == seed.TopicAId);
        topicA.TopicName.Should().Be("Sustainability");
        topicA.BrandMentionRate.Should().BeApproximately(0.5, 1e-9);
        topicA.BrandShareOfVoice.Should().BeApproximately(0.4, 1e-9);
        topicA.CitationCount.Should().Be(8);
        topicA.OwnedCitationShare.Should().BeApproximately(2.0 / 8.0, 1e-9);
        // Mode of {Positive: 5, Neutral: 2} = Positive
        topicA.DominantSentiment.Should().Be("Positive");
    }

    [Fact]
    public async Task SortsByCitationCountDescThenName()
    {
        using var ctx = NewContext();
        var seed = SeedTwoTopics(ctx);
        var sut = new GetScanTopicsQueryHandler(ctx);

        var result = await sut.Handle(new GetScanTopicsQuery(seed.ScanRunId), CancellationToken.None);

        // Sustainability (8 citations) before Urban Design (3).
        result!.Topics.Select(t => t.TopicName).Should().ContainInOrder("Sustainability", "Urban Design");
    }

    [Fact]
    public async Task ReturnsNullOwnedShare_WhenCitationCountIsZero()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var topic = new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Empty Topic", Confidence = 0.5 };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan); ctx.Topics.Add(topic);
        AddMetric(ctx, scan.Id, topic.Id, MetricNames.BrandMentionRate, 0.0);
        AddMetric(ctx, scan.Id, topic.Id, MetricNames.CitationCount, 0);
        AddMetric(ctx, scan.Id, topic.Id, MetricNames.OwnedCitationCount, 0);
        ctx.SaveChanges();

        var sut = new GetScanTopicsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanTopicsQuery(scan.Id), CancellationToken.None);

        var row = result!.Topics.Single();
        row.CitationCount.Should().Be(0);
        row.OwnedCitationShare.Should().BeNull();
    }

    [Fact]
    public async Task DropsTopicWithMissingTopicRow()
    {
        // Defensive: if a topic was deleted after metrics were aggregated,
        // its metrics are orphaned. Skip the row — better than surfacing
        // an "Unknown" topic the user can't act on.
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan);
        AddMetric(ctx, scan.Id, Guid.NewGuid(), MetricNames.CitationCount, 5); // orphan
        ctx.SaveChanges();

        var sut = new GetScanTopicsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanTopicsQuery(scan.Id), CancellationToken.None);
        result!.Topics.Should().BeEmpty();
    }

    [Fact]
    public async Task ReturnsEmpty_WhenScanHasNoTopicMetrics()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan);
        ctx.SaveChanges();

        var sut = new GetScanTopicsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanTopicsQuery(scan.Id), CancellationToken.None);
        result!.Topics.Should().BeEmpty();
    }
}
