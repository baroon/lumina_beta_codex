using AIVisibility.Application;
using AIVisibility.Application.Queries.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetTrackerDashboardQueryHandler tests (Phase 4 v2 Slice A). The
/// consolidated dashboard endpoint returns hero counts + per-entity trend
/// series + top brands table with Δ. Verifies grouping, Δ math, sort order,
/// and the tracked-brand-first invariant.
/// </summary>
public class GetTrackerDashboardQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid TrackerId, Guid BrandId, Guid GenslerId);

    /// <summary>
    /// Standard fixture: tracker with one brand + two tracked competitors
    /// (Gensler, HOK) + 3 scans across the window with rising-brand /
    /// declining-competitor trend data.
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Nostri" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = "Nostri Tracker", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var gensler = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Gensler", Domain = "gensler.com" };
        var hok = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "HOK", Domain = "hok.com" };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.Competitors.Add(gensler);
        ctx.Competitors.Add(hok);
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, CompetitorId = gensler.Id });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, CompetitorId = hok.Id });

        // 3 scans: 14d ago, 7d ago, today.
        var now = DateTime.UtcNow;
        var scans = new[]
        {
            new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = now.AddDays(-14), CompletedAt = now.AddDays(-14) },
            new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = now.AddDays(-7), CompletedAt = now.AddDays(-7) },
            new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = now.AddDays(-1), CompletedAt = now.AddDays(-1) },
        };
        foreach (var s in scans) ctx.ScanRuns.Add(s);

        // Brand visibility (BrandMentionRate) rising 0.30 → 0.35 → 0.40.
        // BrandShareOfVoice rising similarly. Sentiment moves Neutral → Positive.
        var brandMentionRates = new[] { 0.30, 0.35, 0.40 };
        var brandSov = new[] { 0.40, 0.45, 0.50 };
        var brandSentiment = new[] { "Neutral", "Positive", "Positive" };
        for (var i = 0; i < scans.Length; i++)
        {
            AddBrandPoint(ctx, tracker.Id, scans[i].Id, brand.Id, MetricNames.BrandMentionRate, brandMentionRates[i], scans[i].CompletedAt!.Value);
            AddBrandPoint(ctx, tracker.Id, scans[i].Id, brand.Id, MetricNames.BrandShareOfVoice, brandSov[i], scans[i].CompletedAt!.Value);
            AddBrandPoint(ctx, tracker.Id, scans[i].Id, brand.Id, TrendMetrics.OverallSentiment, null, scans[i].CompletedAt!.Value, brandSentiment[i]);
        }

        // Gensler mention rate declining 0.27 → 0.23 → 0.20.
        var genslerMentionRates = new[] { 0.27, 0.23, 0.20 };
        for (var i = 0; i < scans.Length; i++)
        {
            AddCompPoint(ctx, tracker.Id, scans[i].Id, gensler.Id, TrendMetrics.MentionRate, genslerMentionRates[i], scans[i].CompletedAt!.Value);
        }

        // HOK declining too but lower.
        var hokMentionRates = new[] { 0.20, 0.17, 0.13 };
        for (var i = 0; i < scans.Length; i++)
        {
            AddCompPoint(ctx, tracker.Id, scans[i].Id, hok.Id, TrendMetrics.MentionRate, hokMentionRates[i], scans[i].CompletedAt!.Value);
        }

        ctx.SaveChanges();
        return new Seed(tracker.Id, brand.Id, gensler.Id);
    }

    private static void AddBrandPoint(
        AppDbContext ctx, Guid trackerId, Guid scanId, Guid brandId,
        string metric, double? numeric, DateTime capturedAt, string? categorical = null)
    {
        ctx.TrendPoints.Add(new TrendPoint
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = trackerId,
            ScanRunId = scanId,
            EntityType = TrendEntityType.Brand,
            EntityId = brandId,
            MetricName = metric,
            NumericValue = numeric,
            CategoricalValue = categorical,
            CapturedAt = capturedAt,
            CreatedAt = DateTime.UtcNow,
        });
    }

    private static void AddCompPoint(
        AppDbContext ctx, Guid trackerId, Guid scanId, Guid competitorId,
        string metric, double? numeric, DateTime capturedAt)
    {
        ctx.TrendPoints.Add(new TrendPoint
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = trackerId,
            ScanRunId = scanId,
            EntityType = TrendEntityType.Competitor,
            EntityId = competitorId,
            MetricName = metric,
            NumericValue = numeric,
            CapturedAt = capturedAt,
            CreatedAt = DateTime.UtcNow,
        });
    }

    [Fact]
    public async Task ReturnsNull_WhenTrackerDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetTrackerDashboardQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerDashboardQuery(Guid.NewGuid(), 30), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task GroupsTrendPointsIntoOneSeriesPerEntityPerMetric()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerDashboardQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDashboardQuery(seed.TrackerId, 30), CancellationToken.None);

        result.Should().NotBeNull();
        // Brand: BrandMentionRate, BrandShareOfVoice, OverallSentiment = 3 series.
        // Gensler: MentionRate. HOK: MentionRate. = 2 more.
        // Total 5 series.
        result!.Series.Should().HaveCount(5);
        result.Series.Should().AllSatisfy(s => s.Points.Should().HaveCount(3));
    }

    [Fact]
    public async Task TopBrandsRankedByVisibility_TrackedBrandAlwaysFirst()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerDashboardQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDashboardQuery(seed.TrackerId, 30), CancellationToken.None);

        result!.TopBrands.Should().HaveCount(3); // brand + 2 competitors
        // Tracked brand first regardless of rank order.
        result.TopBrands[0].IsTrackedBrand.Should().BeTrue();
        result.TopBrands[0].Name.Should().Be("Nostri");
        // Latest brand visibility = 0.40.
        result.TopBrands[0].Visibility.Should().BeApproximately(0.40, 1e-9);
        // Δ vs previous scan = 0.40 - 0.35 = +0.05.
        result.TopBrands[0].VisibilityDelta.Should().BeApproximately(0.05, 1e-9);

        // Gensler visibility 0.20 > HOK 0.13 — Gensler before HOK.
        result.TopBrands[1].Name.Should().Be("Gensler");
        result.TopBrands[1].Visibility.Should().BeApproximately(0.20, 1e-9);
        result.TopBrands[2].Name.Should().Be("HOK");
    }

    [Fact]
    public async Task TopBrands_VisibilityDelta_IsNullWhenOnlyOneScan()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow.AddDays(-1), CompletedAt = DateTime.UtcNow.AddDays(-1) };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan);
        AddBrandPoint(ctx, tracker.Id, scan.Id, brand.Id, MetricNames.BrandMentionRate, 0.30, scan.CompletedAt!.Value);
        ctx.SaveChanges();

        var sut = new GetTrackerDashboardQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerDashboardQuery(tracker.Id, 30), CancellationToken.None);

        result!.TopBrands.Should().ContainSingle();
        result.TopBrands[0].Visibility.Should().BeApproximately(0.30, 1e-9);
        result.TopBrands[0].VisibilityDelta.Should().BeNull();
    }

    [Fact]
    public async Task TopBrands_LatestSentiment_IsTheMostRecentBrandValue()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerDashboardQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDashboardQuery(seed.TrackerId, 30), CancellationToken.None);

        result!.TopBrands[0].Sentiment.Should().Be("Positive"); // newest scan's sentiment
    }

    [Fact]
    public async Task WindowsOutOldScans()
    {
        // 30d window — verify the 14d-ago scan is INCLUDED but a 45d-ago
        // scan is EXCLUDED.
        using var ctx = NewContext();
        var seed = Build(ctx);
        // Add a trend point at 45d ago for the brand.
        var outside = new TrendPoint
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = seed.TrackerId,
            ScanRunId = Guid.NewGuid(),
            EntityType = TrendEntityType.Brand,
            EntityId = seed.BrandId,
            MetricName = MetricNames.BrandMentionRate,
            NumericValue = 0.01,
            CapturedAt = DateTime.UtcNow.AddDays(-45),
            CreatedAt = DateTime.UtcNow,
        };
        ctx.TrendPoints.Add(outside);
        ctx.SaveChanges();

        var sut = new GetTrackerDashboardQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerDashboardQuery(seed.TrackerId, 30), CancellationToken.None);

        var brandSeries = result!.Series.Single(s => s.MetricName == MetricNames.BrandMentionRate
            && s.EntityId == seed.BrandId);
        brandSeries.Points.Should().HaveCount(3); // not 4 — the 45d-ago point excluded
        brandSeries.Points.Should().NotContain(p => p.Value == 0.01);
    }

    [Fact]
    public async Task DefaultsTo30Days_WhenDaysIsZeroOrNegative()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerDashboardQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDashboardQuery(seed.TrackerId, 0), CancellationToken.None);

        result!.Days.Should().Be(30);
    }
}
