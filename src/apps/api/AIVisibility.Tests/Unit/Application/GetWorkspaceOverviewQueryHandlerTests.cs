using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspaceOverviewQueryHandler tests (Phase 4 v3 Slice A). Verifies
/// cross-brand / cross-tracker aggregation, hero counts, trend series
/// collapse across trackers, Top Entities ordering, and competitor
/// de-duplication when the same Competitor.Id appears under multiple
/// brands.
/// </summary>
public class GetWorkspaceOverviewQueryHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = Guid.Empty;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetWorkspaceOverviewQueryHandler NewHandler(AppDbContext ctx) =>
        new(ctx, new StubWorkspaceContext());

    private sealed record Seed(
        Guid AcmeId, Guid AcmeTrackerId,
        Guid BetaId, Guid BetaTrackerId,
        Guid SharedCompetitorId, Guid AcmeOnlyCompetitorId);

    /// <summary>
    /// Fixture: two tracked brands (Acme, Beta) — multi-brand workspace —
    /// each with one tracker. Both trackers track a shared competitor
    /// (Indeed) — Competitor rows are per-brand so we seed two Competitor
    /// rows with the SAME Id to simulate the shared-competitor case.
    /// Acme also tracks an Acme-only competitor (Glassdoor).
    /// Trend points seeded for two scans per tracker.
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var acme = new Brand { Id = Guid.NewGuid(), Name = "Acme" };
        var beta = new Brand { Id = Guid.NewGuid(), Name = "Beta" };
        var acmeTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = acme.Id, Brand = acme,
            Name = "Acme Tracker", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var betaTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = beta.Id, Brand = beta,
            Name = "Beta Tracker", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };

        // Shared competitor (Indeed) appears under both brands but with the
        // same Competitor.Id — matches the "same logical competitor across
        // brands" case the handler must de-duplicate.
        var sharedId = Guid.NewGuid();
        var indeedForAcme = new Competitor { Id = sharedId, BrandId = acme.Id, Name = "Indeed", Domain = "indeed.com" };
        // Acme-only competitor.
        var glassdoor = new Competitor { Id = Guid.NewGuid(), BrandId = acme.Id, Name = "Glassdoor", Domain = "glassdoor.com" };

        ctx.Brands.Add(acme);
        ctx.Brands.Add(beta);
        ctx.TrackerConfigurations.Add(acmeTracker);
        ctx.TrackerConfigurations.Add(betaTracker);
        ctx.Competitors.Add(indeedForAcme);
        ctx.Competitors.Add(glassdoor);
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, CompetitorId = sharedId });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, CompetitorId = glassdoor.Id });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = betaTracker.Id, CompetitorId = sharedId });

        // 2 scans per tracker: 14d ago and 1d ago. Each gets a prompt-run / answer.
        var now = DateTime.UtcNow;
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "category-discovery", Name = "Category Discovery" };
        ctx.AIPlatforms.Add(platform);
        ctx.Lenses.Add(lens);

        // Helper to seed one scan with one prompt-run + one answer + a brand mention.
        // Records seeded scans by tracker so the caller can later seed
        // competitor trend points without re-querying the in-memory store.
        var scansByTracker = new Dictionary<Guid, List<ScanRun>>
        {
            [acmeTracker.Id] = new(),
            [betaTracker.Id] = new(),
        };
        void SeedScanWithAnswer(TrackerConfiguration tracker, DateTime startedAt, Brand brand, bool mentionsBrand)
        {
            var prompt = new Prompt
            {
                Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, PromptText = "p",
                LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
                CreatedAt = now, UpdatedAt = now,
            };
            var scan = new ScanRun
            {
                Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker,
                TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
                StartedAt = startedAt, CompletedAt = startedAt,
            };
            var run = new PromptRun
            {
                Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id,
                AIPlatformId = platform.Id, Status = PromptRunStatus.Completed, StartedAt = startedAt,
            };
            var answer = new AIAnswer
            {
                Id = Guid.NewGuid(), PromptRunId = run.Id,
                AnswerText = "a", CreatedAt = startedAt,
            };
            ctx.Prompts.Add(prompt);
            ctx.ScanRuns.Add(scan);
            ctx.PromptRuns.Add(run);
            ctx.AIAnswers.Add(answer);
            scansByTracker[tracker.Id].Add(scan);
            if (mentionsBrand)
            {
                ctx.Mentions.Add(new Mention
                {
                    Id = Guid.NewGuid(), AIAnswerId = answer.Id,
                    EntityType = MentionEntityType.Brand, EntityId = brand.Id,
                    NormalizedName = brand.Name, EvidenceSnippet = "e",
                    IsRecommended = false, Sentiment = Sentiment.Positive,
                    CreatedAt = startedAt,
                });
            }

            // Trend points — one per metric per entity for this scan.
            var brandMentionRate = mentionsBrand ? 1.0 : 0.0;
            ctx.TrendPoints.Add(NewTrendPoint(tracker.Id, scan.Id, TrendEntityType.Brand, brand.Id, MetricNames.BrandMentionRate, brandMentionRate, startedAt));
            ctx.TrendPoints.Add(NewTrendPoint(tracker.Id, scan.Id, TrendEntityType.Brand, brand.Id, MetricNames.BrandShareOfVoice, 0.5, startedAt));
            ctx.TrendPoints.Add(NewTrendPoint(tracker.Id, scan.Id, TrendEntityType.Brand, brand.Id, TrendMetrics.OverallSentiment, null, startedAt, "Positive"));
        }

        SeedScanWithAnswer(acmeTracker, now.AddDays(-14), acme, mentionsBrand: true);
        SeedScanWithAnswer(acmeTracker, now.AddDays(-1), acme, mentionsBrand: true);
        SeedScanWithAnswer(betaTracker, now.AddDays(-14), beta, mentionsBrand: false);
        SeedScanWithAnswer(betaTracker, now.AddDays(-1), beta, mentionsBrand: true);

        // Competitor trend points only on Acme's tracker for the shared competitor.
        var acmeScans = scansByTracker[acmeTracker.Id].OrderBy(s => s.StartedAt).ToList();
        ctx.TrendPoints.Add(NewTrendPoint(acmeTracker.Id, acmeScans[0].Id, TrendEntityType.Competitor, sharedId, TrendMetrics.MentionRate, 0.10, acmeScans[0].StartedAt));
        ctx.TrendPoints.Add(NewTrendPoint(acmeTracker.Id, acmeScans[1].Id, TrendEntityType.Competitor, sharedId, TrendMetrics.MentionRate, 0.20, acmeScans[1].StartedAt));

        ctx.SaveChanges();
        return new Seed(acme.Id, acmeTracker.Id, beta.Id, betaTracker.Id, sharedId, glassdoor.Id);
    }

    private static TrendPoint NewTrendPoint(
        Guid trackerId, Guid scanRunId, TrendEntityType entityType, Guid entityId,
        string metric, double? numeric, DateTime capturedAt, string? categorical = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = trackerId,
            ScanRunId = scanRunId,
            EntityType = entityType,
            EntityId = entityId,
            MetricName = metric,
            NumericValue = numeric,
            CategoricalValue = categorical,
            CapturedAt = capturedAt,
            CreatedAt = capturedAt,
        };

    [Fact]
    public async Task ReturnsEmpty_WhenWorkspaceHasNoBrands()
    {
        using var ctx = NewContext();
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(30), CancellationToken.None);

        result.Should().NotBeNull();
        result.TrackedBrands.Should().BeEmpty();
        result.Competitors.Should().BeEmpty();
        result.ScanCount.Should().Be(0);
        result.Hero.Queries.Should().Be(0);
        result.Hero.BrandMentionRate.Should().BeNull();
        result.Series.Should().BeEmpty();
        result.TopEntities.Should().BeEmpty();
    }

    [Fact]
    public async Task TrackedBrands_AndCompetitors_AreDeduplicatedAndAlphabetical()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(30), CancellationToken.None);

        // Two tracked brands.
        result.TrackedBrands.Select(b => b.Name).Should().Equal("Acme", "Beta");

        // Indeed is in both trackers but de-dups by Competitor.Id. Plus Glassdoor.
        result.Competitors.Select(c => c.Name).Should().Equal("Glassdoor", "Indeed");
        result.Competitors.Single(c => c.Name == "Indeed").CompetitorId.Should().Be(seed.SharedCompetitorId);
    }

    [Fact]
    public async Task Hero_AggregatesAcrossTrackers()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(30), CancellationToken.None);

        // 4 scans total (2 per tracker × 2 trackers) → 4 prompt-runs → 4 answers.
        // Brand mentions on 3 of them (Acme x2 + Beta latest). BrandMentionRate = 3/4.
        result.ScanCount.Should().Be(4);
        result.Hero.Queries.Should().Be(4);
        result.Hero.Mentions.Should().Be(3);
        result.Hero.BrandMentionRate.Should().BeApproximately(3.0 / 4.0, 1e-9);
    }

    [Fact]
    public async Task Series_IncludesAllEntitiesAcrossTrackers()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(30), CancellationToken.None);

        // Both tracked brands appear in the trend series (each has a BrandMentionRate series).
        var brandSeries = result.Series.Where(s => s.MetricName == MetricNames.BrandMentionRate).ToList();
        brandSeries.Should().HaveCount(2);
        brandSeries.Should().Contain(s => s.EntityName == "Acme");
        brandSeries.Should().Contain(s => s.EntityName == "Beta");

        // Competitor series for Indeed (only from Acme tracker, 2 points).
        var competitorSeries = result.Series.Single(s => s.EntityName == "Indeed" && s.MetricName == TrendMetrics.MentionRate);
        competitorSeries.Points.Should().HaveCount(2);
        competitorSeries.Points.Last().Value.Should().Be(0.20);
    }

    [Fact]
    public async Task TopEntities_TrackedBrandsFirstAlphabetical_ThenCompetitorsByVisibility()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(30), CancellationToken.None);

        // Tracked brands first, in alpha order. Then competitor (Indeed).
        result.TopEntities[0].Name.Should().Be("Acme");
        result.TopEntities[0].IsTrackedBrand.Should().BeTrue();
        result.TopEntities[1].Name.Should().Be("Beta");
        result.TopEntities[1].IsTrackedBrand.Should().BeTrue();

        // Acme's visibility = 1.0 (latest BrandMentionRate); delta = 0 (1.0 - 1.0).
        result.TopEntities[0].Visibility.Should().Be(1.0);
        result.TopEntities[0].VisibilityDelta.Should().Be(0.0);

        // Beta's visibility = 1.0 (latest = 1.0, previous = 0.0); delta = +1.0.
        result.TopEntities[1].Visibility.Should().Be(1.0);
        result.TopEntities[1].VisibilityDelta.Should().Be(1.0);

        // Indeed appears as a competitor row.
        var indeed = result.TopEntities.Single(r => r.Name == "Indeed");
        indeed.IsTrackedBrand.Should().BeFalse();
        indeed.Visibility.Should().Be(0.20);
        indeed.VisibilityDelta.Should().BeApproximately(0.10, 1e-9);
    }

    [Fact]
    public async Task WindowFilter_ExcludesScansOutsideWindow()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        // Days=5 — only the 1d-ago scans land in window. The 14d-ago ones drop.
        var result = await sut.Handle(new GetWorkspaceOverviewQuery(5), CancellationToken.None);

        // 2 scans (1 per tracker, the most recent each).
        result.ScanCount.Should().Be(2);
        // Trend series still exists for the latest scan only.
        var acme = result.Series.FirstOrDefault(s => s.EntityName == "Acme" && s.MetricName == MetricNames.BrandMentionRate);
        acme.Should().NotBeNull();
        acme!.Points.Should().HaveCount(1);
    }
}
