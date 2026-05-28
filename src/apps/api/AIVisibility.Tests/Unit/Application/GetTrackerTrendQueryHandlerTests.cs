using AIVisibility.Application;
using AIVisibility.Application.Queries.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetTrackerTrendQueryHandler tests — windowed read of trend_points
/// grouped into per-metric series (Phase 4 Slice 6).
/// </summary>
public class GetTrackerTrendQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Guid SeedTracker(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.SaveChanges();
        return tracker.Id;
    }

    private static void AddPoint(
        AppDbContext ctx, Guid trackerId, string metric,
        DateTime capturedAt, double? numeric = null, string? categorical = null)
    {
        ctx.TrendPoints.Add(new TrendPoint
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = trackerId,
            ScanRunId = Guid.NewGuid(),
            MetricName = metric,
            NumericValue = numeric,
            CategoricalValue = categorical,
            CapturedAt = capturedAt,
            CreatedAt = DateTime.UtcNow,
        });
    }

    [Fact]
    public async Task ReturnsNull_WhenTrackerDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetTrackerTrendQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerTrendQuery(Guid.NewGuid(), 30), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task GroupsPointsIntoOneSeriesPerMetric()
    {
        using var ctx = NewContext();
        var trackerId = SeedTracker(ctx);
        var now = DateTime.UtcNow;
        AddPoint(ctx, trackerId, MetricNames.BrandMentionRate, now.AddDays(-5), numeric: 0.4);
        AddPoint(ctx, trackerId, MetricNames.BrandMentionRate, now.AddDays(-1), numeric: 0.5);
        AddPoint(ctx, trackerId, MetricNames.BrandRecommendationRate, now.AddDays(-3), numeric: 0.2);
        ctx.SaveChanges();

        var sut = new GetTrackerTrendQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerTrendQuery(trackerId, 30), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Series.Should().HaveCount(2);
        result.Series.Single(s => s.MetricName == MetricNames.BrandMentionRate)
            .Points.Should().HaveCount(2);
        result.Series.Single(s => s.MetricName == MetricNames.BrandRecommendationRate)
            .Points.Should().HaveCount(1);
    }

    [Fact]
    public async Task OrdersPointsByCapturedAtAscending()
    {
        using var ctx = NewContext();
        var trackerId = SeedTracker(ctx);
        var now = DateTime.UtcNow;
        AddPoint(ctx, trackerId, MetricNames.BrandMentionRate, now.AddDays(-1), numeric: 0.5);
        AddPoint(ctx, trackerId, MetricNames.BrandMentionRate, now.AddDays(-10), numeric: 0.3);
        AddPoint(ctx, trackerId, MetricNames.BrandMentionRate, now.AddDays(-5), numeric: 0.4);
        ctx.SaveChanges();

        var sut = new GetTrackerTrendQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerTrendQuery(trackerId, 30), CancellationToken.None);

        result!.Series.Single().Points.Select(p => p.Value).Should().ContainInOrder(0.3, 0.4, 0.5);
    }

    [Fact]
    public async Task FiltersOutPointsOutsideTheWindow()
    {
        using var ctx = NewContext();
        var trackerId = SeedTracker(ctx);
        var now = DateTime.UtcNow;
        AddPoint(ctx, trackerId, MetricNames.BrandMentionRate, now.AddDays(-5), numeric: 0.5);
        AddPoint(ctx, trackerId, MetricNames.BrandMentionRate, now.AddDays(-45), numeric: 0.1); // outside 30d
        ctx.SaveChanges();

        var sut = new GetTrackerTrendQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerTrendQuery(trackerId, 30), CancellationToken.None);

        result!.Series.Single().Points.Should().ContainSingle()
            .Which.Value.Should().Be(0.5);
    }

    [Fact]
    public async Task TagsCategoricalSeriesAsCategorical()
    {
        using var ctx = NewContext();
        var trackerId = SeedTracker(ctx);
        var now = DateTime.UtcNow;
        AddPoint(ctx, trackerId, "OverallSentiment", now.AddDays(-1), categorical: "Positive");
        AddPoint(ctx, trackerId, MetricNames.BrandMentionRate, now.AddDays(-1), numeric: 0.5);
        ctx.SaveChanges();

        var sut = new GetTrackerTrendQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerTrendQuery(trackerId, 30), CancellationToken.None);

        result!.Series.Single(s => s.MetricName == "OverallSentiment").SeriesKind.Should().Be("Categorical");
        result.Series.Single(s => s.MetricName == MetricNames.BrandMentionRate).SeriesKind.Should().Be("Numeric");
    }

    [Fact]
    public async Task DefaultsTo30Days_WhenDaysIsZeroOrNegative()
    {
        using var ctx = NewContext();
        var trackerId = SeedTracker(ctx);
        ctx.SaveChanges();

        var sut = new GetTrackerTrendQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerTrendQuery(trackerId, 0), CancellationToken.None);

        result!.Days.Should().Be(30);
    }
}
