using AIVisibility.Application;
using AIVisibility.Application.Queries.Competitors;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetScanCompetitorQueryHandler tests. Verifies per-competitor metric
/// pivot + the "sources that mentioned this competitor" join — citations
/// on answers where the competitor appears in mentions (Phase 4 v1 plan
/// §Slice 4, D17).
/// </summary>
public class GetScanCompetitorQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid ScanRunId, Guid CompetitorId, Guid SourceTrustpilotId);

    /// <summary>
    /// Fixture: scan with 4 answers. Acme is mentioned on answer A1 and A3.
    /// Trustpilot is cited on A1 (×2) and A3 (×1). Wikipedia is cited on
    /// A2 (which doesn't mention Acme — should NOT appear in the result).
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Lumina" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var acme = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Acme", Domain = "acme.com" };
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "OpenAI" };
        var prompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, PromptText = "p", LensId = Guid.NewGuid(), Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };

        var trustpilot = new Source { Id = Guid.NewGuid(), SourceName = "Trustpilot", NormalizedDomain = "trustpilot.com", CreatedAt = DateTime.UtcNow };
        var wikipedia = new Source { Id = Guid.NewGuid(), SourceName = "Wikipedia", NormalizedDomain = "en.wikipedia.org", CreatedAt = DateTime.UtcNow };

        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan);
        ctx.Competitors.Add(acme); ctx.AIPlatforms.Add(platform); ctx.Prompts.Add(prompt);
        ctx.Sources.Add(trustpilot); ctx.Sources.Add(wikipedia);

        var a1 = NewAnswer(ctx, scan.Id, prompt.Id, platform.Id);
        var a2 = NewAnswer(ctx, scan.Id, prompt.Id, platform.Id);
        var a3 = NewAnswer(ctx, scan.Id, prompt.Id, platform.Id);
        var a4 = NewAnswer(ctx, scan.Id, prompt.Id, platform.Id);

        // Acme mentioned on a1, a3 — but NOT a2 or a4.
        ctx.Mentions.Add(NewMention(a1, acme.Id, MentionEntityType.Competitor));
        ctx.Mentions.Add(NewMention(a3, acme.Id, MentionEntityType.Competitor));

        // Trustpilot cited 2× on a1, 1× on a3.  Wikipedia cited on a2 (which doesn't mention Acme).
        ctx.Citations.Add(NewCitation(a1, trustpilot.Id));
        ctx.Citations.Add(NewCitation(a1, trustpilot.Id));
        ctx.Citations.Add(NewCitation(a3, trustpilot.Id));
        ctx.Citations.Add(NewCitation(a2, wikipedia.Id));

        // Pre-computed competitor metrics: 2 mentions, 1 recommendation.
        AddMetric(ctx, scan.Id, acme.Id, MetricNames.MentionCount, 2);
        AddMetric(ctx, scan.Id, acme.Id, MetricNames.RecommendationCount, 1);

        ctx.SaveChanges();
        return new Seed(scan.Id, acme.Id, trustpilot.Id);
    }

    [Fact]
    public async Task ReturnsNull_WhenScanDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetScanCompetitorQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorQuery(Guid.NewGuid(), Guid.NewGuid()), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNull_WhenCompetitorDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetScanCompetitorQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorQuery(seed.ScanRunId, Guid.NewGuid()), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task PivotsCompetitorMetricsIntoDetail()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetScanCompetitorQueryHandler(ctx);

        var result = await sut.Handle(new GetScanCompetitorQuery(seed.ScanRunId, seed.CompetitorId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Name.Should().Be("Acme");
        result.Metrics.MentionCount.Should().Be(2);
        result.Metrics.RecommendationCount.Should().Be(1);
        // 2 of 4 answers in the scan = 0.5.
        result.Metrics.MentionRate.Should().BeApproximately(0.5, 1e-9);
        // 1 of 2 mentions recommended = 0.5.
        result.Metrics.RecommendationRate.Should().BeApproximately(0.5, 1e-9);
    }

    [Fact]
    public async Task SourcesMentioningCompetitor_OnlyIncludesCitationsOnCompetitorMentionAnswers()
    {
        // Trustpilot was cited 3× on a1+a3 (both mention Acme).
        // Wikipedia was cited on a2 (no Acme mention) — MUST NOT appear.
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetScanCompetitorQueryHandler(ctx);

        var result = await sut.Handle(new GetScanCompetitorQuery(seed.ScanRunId, seed.CompetitorId), CancellationToken.None);

        result!.SourcesMentioningCompetitor.Should().HaveCount(1);
        result.SourcesMentioningCompetitor[0].SourceName.Should().Be("Trustpilot");
        result.SourcesMentioningCompetitor[0].CitationCount.Should().Be(3);
    }

    [Fact]
    public async Task ReturnsEmptySources_WhenCompetitorWasNeverMentioned()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var comp = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Untouched", Domain = "untouched.com" };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan); ctx.Competitors.Add(comp);
        ctx.SaveChanges();

        var sut = new GetScanCompetitorQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorQuery(scan.Id, comp.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.SourcesMentioningCompetitor.Should().BeEmpty();
    }

    [Fact]
    public async Task SourcesAreSortedByCitationCountDesc()
    {
        // Two sources both cited on competitor-mention answers — ensure the
        // sort is deterministic by count then name.
        using var ctx = NewContext();
        var seed = Build(ctx);
        // Add a fifth answer that also mentions Acme + cites Wikipedia once.
        var brand = ctx.Brands.AsTracking().Single();
        var prompt = ctx.Prompts.AsTracking().Single();
        var platform = ctx.AIPlatforms.AsTracking().Single();
        var a5 = NewAnswer(ctx, seed.ScanRunId, prompt.Id, platform.Id);
        ctx.Mentions.Add(NewMention(a5, seed.CompetitorId, MentionEntityType.Competitor));
        var wikipediaId = ctx.Sources.AsTracking().Single(s => s.SourceName == "Wikipedia").Id;
        ctx.Citations.Add(NewCitation(a5, wikipediaId));
        ctx.SaveChanges();

        var sut = new GetScanCompetitorQueryHandler(ctx);
        var result = await sut.Handle(new GetScanCompetitorQuery(seed.ScanRunId, seed.CompetitorId), CancellationToken.None);

        // Trustpilot (3) before Wikipedia (1).
        result!.SourcesMentioningCompetitor.Select(s => s.SourceName)
            .Should().ContainInOrder("Trustpilot", "Wikipedia");
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private static Guid NewAnswer(AppDbContext ctx, Guid scanId, Guid promptId, Guid platformId)
    {
        var run = new PromptRun { Id = Guid.NewGuid(), ScanRunId = scanId, PromptId = promptId, AIPlatformId = platformId, Status = PromptRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var answer = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = run.Id, AnswerText = "a", CreatedAt = DateTime.UtcNow };
        var signal = new AnswerSignal { Id = Guid.NewGuid(), AIAnswerId = answer.Id, CreatedAt = DateTime.UtcNow };
        ctx.PromptRuns.Add(run);
        ctx.AIAnswers.Add(answer);
        ctx.AnswerSignals.Add(signal);
        return answer.Id;
    }

    private static Mention NewMention(Guid answerId, Guid entityId, MentionEntityType type) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId,
        EntityType = type, EntityId = entityId,
        NormalizedName = "n", EvidenceSnippet = "e",
        CreatedAt = DateTime.UtcNow,
    };

    private static Citation NewCitation(Guid answerId, Guid sourceId) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId, SourceId = sourceId,
        CitationType = CitationType.ExplicitUrl, CreatedAt = DateTime.UtcNow,
    };

    private static void AddMetric(AppDbContext ctx, Guid scanId, Guid scopeId, string name, double value)
    {
        ctx.ScanMetrics.Add(new ScanMetric
        {
            Id = Guid.NewGuid(), ScanRunId = scanId,
            Scope = ScanMetricScope.Competitor, ScopeId = scopeId,
            MetricName = name, MetricValue = value, CreatedAt = DateTime.UtcNow,
        });
    }
}
