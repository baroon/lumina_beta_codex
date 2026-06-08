using AIVisibility.Application;
using AIVisibility.Application.Queries.Competitors;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetScanCompetitorsQueryHandler tests. Pivots Competitor-scope
/// ScanMetric rows and derives MentionRate / RecommendationRate
/// (Phase 4 v1 plan §Slice 4).
/// </summary>
public class GetScanCompetitorsQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static (Guid ScanRunId, Guid AcmeId, Guid BetaId) SeedScanWithTwoCompetitors(
        AppDbContext ctx, int answerCount = 10)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Lumina" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var acme = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Acme", Domain = "acme.com" };
        var beta = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Beta", Domain = "beta.com" };
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "OpenAI" };
        var prompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, PromptText = "p", LensId = Guid.NewGuid(), Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);
        ctx.Competitors.Add(acme); ctx.Competitors.Add(beta);
        ctx.AIPlatforms.Add(platform);
        ctx.Prompts.Add(prompt);

        // Seed `answerCount` answers, each with a signal, so the handler's
        // MentionRate denominator is well-defined.
        for (var i = 0; i < answerCount; i++)
        {
            var run = new PromptRun { Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id, AIPlatformId = platform.Id, Status = PromptRunStatus.Completed, StartedAt = DateTime.UtcNow };
            var answer = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = run.Id, AnswerText = "a", CreatedAt = DateTime.UtcNow };
            ctx.PromptRuns.Add(run);
            ctx.AIAnswers.Add(answer);
            ctx.AnswerSignals.Add(new AnswerSignal { Id = Guid.NewGuid(), AIAnswerId = answer.Id, CreatedAt = DateTime.UtcNow });
        }

        // Aggregator output: Acme mentioned 4×, recommended 1×. Beta mentioned 2×, recommended 0×.
        AddMetric(ctx, scan.Id, acme.Id, MetricNames.MentionCount, 4);
        AddMetric(ctx, scan.Id, acme.Id, MetricNames.RecommendationCount, 1);
        AddMetric(ctx, scan.Id, acme.Id, MetricNames.CompetitorShareOfVoice, 0.5);
        AddMetric(ctx, scan.Id, acme.Id, MetricNames.CompetitorRecommendationShare, 0.4);
        AddMetric(ctx, scan.Id, beta.Id, MetricNames.MentionCount, 2);
        AddMetric(ctx, scan.Id, beta.Id, MetricNames.RecommendationCount, 0);
        AddMetric(ctx, scan.Id, beta.Id, MetricNames.CompetitorShareOfVoice, 0.25);
        AddMetric(ctx, scan.Id, beta.Id, MetricNames.CompetitorRecommendationShare, 0.0);

        ctx.SaveChanges();
        return (scan.Id, acme.Id, beta.Id);
    }

    private static void AddMetric(AppDbContext ctx, Guid scanId, Guid scopeId, string name, double value)
    {
        ctx.ScanMetrics.Add(new ScanMetric
        {
            Id = Guid.NewGuid(), ScanRunId = scanId,
            Scope = ScanMetricScope.Competitor, ScopeId = scopeId,
            MetricName = name, MetricValue = value, CreatedAt = DateTime.UtcNow,
        });
    }

    [Fact]
    public async Task ReturnsNull_WhenScanDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetScanCompetitorsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorsQuery(Guid.NewGuid()), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task PivotsCompetitorMetricsIntoListRows()
    {
        using var ctx = NewContext();
        var seed = SeedScanWithTwoCompetitors(ctx, answerCount: 10);
        var sut = new GetScanCompetitorsQueryHandler(ctx);

        var result = await sut.Handle(new GetScanCompetitorsQuery(seed.ScanRunId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Competitors.Should().HaveCount(2);

        var acme = result.Competitors.Single(c => c.CompetitorId == seed.AcmeId);
        acme.Name.Should().Be("Acme");
        acme.Domain.Should().Be("acme.com");
        acme.MentionCount.Should().Be(4);
        acme.RecommendationCount.Should().Be(1);
        // 4 mentions across 10 answers = 0.4.
        acme.MentionRate.Should().BeApproximately(0.4, 1e-9);
        // 1 recommendation across 4 mentions = 0.25.
        acme.RecommendationRate.Should().BeApproximately(0.25, 1e-9);
        // CompetitorShareOfVoice flows through from the seeded scan_metrics row.
        acme.ShareOfVoice.Should().BeApproximately(0.5, 1e-9);
        // CompetitorRecommendationShare flows through too — same pattern.
        acme.RecommendationShare.Should().BeApproximately(0.4, 1e-9);
    }

    [Fact]
    public async Task ShareOfVoice_IsNull_WhenMetricRowMissing()
    {
        // Sanity: if the aggregator hasn't emitted a CompetitorShareOfVoice
        // row yet (in-progress scan, or aggregator skipped the metric for a
        // competitor with no mentions), the handler surfaces it as null
        // rather than zero — same semantics as the other rate fields.
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var comp = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Epsilon", Domain = "eps.com" };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan); ctx.Competitors.Add(comp);
        AddMetric(ctx, scan.Id, comp.Id, MetricNames.MentionCount, 1);
        AddMetric(ctx, scan.Id, comp.Id, MetricNames.RecommendationCount, 0);
        ctx.SaveChanges();

        var sut = new GetScanCompetitorsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorsQuery(scan.Id), CancellationToken.None);
        result!.Competitors.Single().ShareOfVoice.Should().BeNull();
    }

    [Fact]
    public async Task SortsByMentionCountDescThenName()
    {
        using var ctx = NewContext();
        var seed = SeedScanWithTwoCompetitors(ctx);
        var sut = new GetScanCompetitorsQueryHandler(ctx);

        var result = await sut.Handle(new GetScanCompetitorsQuery(seed.ScanRunId), CancellationToken.None);

        // Acme (4 mentions) before Beta (2).
        result!.Competitors.Select(c => c.Name).Should().ContainInOrder("Acme", "Beta");
    }

    [Fact]
    public async Task ReturnsNullRecommendationRate_WhenMentionCountIsZero()
    {
        // Defense-in-depth — competitor never mentioned in this scan still
        // has metrics rows (count=0, recCount=0). Recommendation rate must
        // be null (no denominator), not 0/0 = NaN.
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var comp = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Gamma", Domain = "gamma.com" };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan); ctx.Competitors.Add(comp);
        AddMetric(ctx, scan.Id, comp.Id, MetricNames.MentionCount, 0);
        AddMetric(ctx, scan.Id, comp.Id, MetricNames.RecommendationCount, 0);
        ctx.SaveChanges();

        var sut = new GetScanCompetitorsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorsQuery(scan.Id), CancellationToken.None);

        var row = result!.Competitors.Single();
        row.MentionCount.Should().Be(0);
        row.RecommendationCount.Should().Be(0);
        row.RecommendationRate.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNullMentionRate_WhenScanHasZeroAnswers()
    {
        // Even with seeded competitor metrics, if no signal rows exist
        // (e.g. all answers were bad-JSON D3 failures), the rate denominator
        // is zero — surface as null.
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var comp = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Delta", Domain = "delta.com" };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan); ctx.Competitors.Add(comp);
        AddMetric(ctx, scan.Id, comp.Id, MetricNames.MentionCount, 3);
        AddMetric(ctx, scan.Id, comp.Id, MetricNames.RecommendationCount, 1);
        ctx.SaveChanges();

        var sut = new GetScanCompetitorsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorsQuery(scan.Id), CancellationToken.None);

        result!.Competitors.Single().MentionRate.Should().BeNull();
    }

    [Fact]
    public async Task DropsCompetitorWithMissingRow()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan);
        AddMetric(ctx, scan.Id, Guid.NewGuid(), MetricNames.MentionCount, 5); // orphan
        ctx.SaveChanges();

        var sut = new GetScanCompetitorsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorsQuery(scan.Id), CancellationToken.None);
        result!.Competitors.Should().BeEmpty();
    }
}
