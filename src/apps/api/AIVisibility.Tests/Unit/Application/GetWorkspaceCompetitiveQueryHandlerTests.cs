using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspaceCompetitiveQueryHandler tests (Phase 4 v3 Slice B). Multi-
/// brand competitive aggregation: top citation domains across the
/// workspace, mention distribution with tracked-brand-first ordering,
/// per-tracked-brand competitive gap groups (gap math scoped to the
/// brand's own scan set), recommendation rates per entity.
/// </summary>
public class GetWorkspaceCompetitiveQueryHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = Guid.Empty;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetWorkspaceCompetitiveQueryHandler NewHandler(AppDbContext ctx) =>
        new(ctx, new StubWorkspaceContext());

    private sealed record Seed(
        Guid AcmeId, Guid AcmeTrackerId,
        Guid BetaId, Guid BetaTrackerId,
        Guid SharedCompetitorId, Guid AcmeOnlyCompetitorId,
        Guid AcmeAnswerId, Guid BetaAnswerId,
        Guid TrustpilotId, Guid WikipediaId);

    /// <summary>
    /// Fixture: two tracked brands (Acme, Beta), each with one tracker.
    /// Both track a shared competitor (Indeed, same Competitor.Id);
    /// Acme also tracks Glassdoor. Each tracker has 1 scan with 1 answer.
    /// Acme's answer cites Trustpilot×3 + Wikipedia×1; Beta's answer cites
    /// Trustpilot×1. Mentions seeded to give per-brand gap math.
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

        var sharedId = Guid.NewGuid();
        var indeedForAcme = new Competitor { Id = sharedId, BrandId = acme.Id, Name = "Indeed", Domain = "indeed.com" };
        var glassdoor = new Competitor { Id = Guid.NewGuid(), BrandId = acme.Id, Name = "Glassdoor", Domain = "glassdoor.com" };

        ctx.Brands.AddRange(acme, beta);
        ctx.TrackerConfigurations.AddRange(acmeTracker, betaTracker);
        ctx.Competitors.AddRange(indeedForAcme, glassdoor);
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, CompetitorId = sharedId });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, CompetitorId = glassdoor.Id });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = betaTracker.Id, CompetitorId = sharedId });

        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT" };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "x", Name = "x" };
        ctx.AIPlatforms.Add(platform);
        ctx.Lenses.Add(lens);

        var now = DateTime.UtcNow;
        var acmePrompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, PromptText = "p", LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = now, UpdatedAt = now };
        var betaPrompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = betaTracker.Id, PromptText = "p", LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = now, UpdatedAt = now };
        ctx.Prompts.AddRange(acmePrompt, betaPrompt);

        var acmeScan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, TrackerConfiguration = acmeTracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = now.AddDays(-1), CompletedAt = now.AddDays(-1) };
        var betaScan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = betaTracker.Id, TrackerConfiguration = betaTracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = now.AddDays(-1), CompletedAt = now.AddDays(-1) };
        ctx.ScanRuns.AddRange(acmeScan, betaScan);

        var acmeRun = new PromptRun { Id = Guid.NewGuid(), ScanRunId = acmeScan.Id, PromptId = acmePrompt.Id, AIPlatformId = platform.Id, Status = PromptRunStatus.Completed, StartedAt = now };
        var betaRun = new PromptRun { Id = Guid.NewGuid(), ScanRunId = betaScan.Id, PromptId = betaPrompt.Id, AIPlatformId = platform.Id, Status = PromptRunStatus.Completed, StartedAt = now };
        ctx.PromptRuns.AddRange(acmeRun, betaRun);

        var acmeAnswer = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = acmeRun.Id, AnswerText = "a", CreatedAt = now };
        var betaAnswer = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = betaRun.Id, AnswerText = "a", CreatedAt = now };
        ctx.AIAnswers.AddRange(acmeAnswer, betaAnswer);
        ctx.AnswerSignals.Add(new AnswerSignal { Id = Guid.NewGuid(), AIAnswerId = acmeAnswer.Id, CreatedAt = now });
        ctx.AnswerSignals.Add(new AnswerSignal { Id = Guid.NewGuid(), AIAnswerId = betaAnswer.Id, CreatedAt = now });

        // Mentions on Acme's answer: Acme x4 (2 recommended), Indeed x2 (1 rec), Glassdoor x1 (0 rec).
        for (var i = 0; i < 4; i++)
            ctx.Mentions.Add(NewMention(acmeAnswer.Id, MentionEntityType.Brand, acme.Id, i < 2));
        for (var i = 0; i < 2; i++)
            ctx.Mentions.Add(NewMention(acmeAnswer.Id, MentionEntityType.Competitor, sharedId, i == 0));
        ctx.Mentions.Add(NewMention(acmeAnswer.Id, MentionEntityType.Competitor, glassdoor.Id, recommended: false));

        // Mentions on Beta's answer: Beta x3 (1 recommended), Indeed x5 (2 rec).
        for (var i = 0; i < 3; i++)
            ctx.Mentions.Add(NewMention(betaAnswer.Id, MentionEntityType.Brand, beta.Id, i == 0));
        for (var i = 0; i < 5; i++)
            ctx.Mentions.Add(NewMention(betaAnswer.Id, MentionEntityType.Competitor, sharedId, i < 2));

        // Citations: Acme answer cites Trustpilot x3 + Wikipedia x1, Beta answer cites Trustpilot x1.
        var trustpilot = new Source { Id = Guid.NewGuid(), SourceName = "Trustpilot", Domain = "trustpilot.com", NormalizedDomain = "trustpilot.com", CreatedAt = now };
        var wikipedia = new Source { Id = Guid.NewGuid(), SourceName = "Wikipedia", Domain = "en.wikipedia.org", NormalizedDomain = "en.wikipedia.org", CreatedAt = now };
        ctx.Sources.AddRange(trustpilot, wikipedia);
        ctx.BrandSourceClassifications.Add(new BrandSourceClassification { Id = Guid.NewGuid(), BrandId = acme.Id, SourceId = trustpilot.Id, SourceType = SourceType.Editorial, ConfidenceScore = 0.9, ProvenanceSource = ClassificationSource.LLMClassified, Status = ClassificationStatus.Active, CreatedAt = now, UpdatedAt = now });
        ctx.BrandSourceClassifications.Add(new BrandSourceClassification { Id = Guid.NewGuid(), BrandId = acme.Id, SourceId = wikipedia.Id, SourceType = SourceType.Reference, ConfidenceScore = 0.9, ProvenanceSource = ClassificationSource.LLMClassified, Status = ClassificationStatus.Active, CreatedAt = now, UpdatedAt = now });
        for (var i = 0; i < 3; i++) ctx.Citations.Add(NewCitation(acmeAnswer.Id, trustpilot.Id));
        ctx.Citations.Add(NewCitation(acmeAnswer.Id, wikipedia.Id));
        ctx.Citations.Add(NewCitation(betaAnswer.Id, trustpilot.Id));

        ctx.SaveChanges();
        return new Seed(
            acme.Id, acmeTracker.Id, beta.Id, betaTracker.Id,
            sharedId, glassdoor.Id, acmeAnswer.Id, betaAnswer.Id,
            trustpilot.Id, wikipedia.Id);
    }

    private static Mention NewMention(Guid answerId, MentionEntityType type, Guid entityId, bool recommended) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId, EntityType = type, EntityId = entityId,
        NormalizedName = "n", EvidenceSnippet = "e", IsRecommended = recommended,
        CreatedAt = DateTime.UtcNow,
    };

    private static Citation NewCitation(Guid answerId, Guid sourceId) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId, SourceId = sourceId,
        CitationType = CitationType.ExplicitUrl, CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task ReturnsEmpty_WhenWorkspaceHasNoBrands()
    {
        using var ctx = NewContext();
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceCompetitiveQuery(30), CancellationToken.None);

        result.Should().NotBeNull();
        result.TopDomains.Should().BeEmpty();
        result.MentionDistribution.Should().BeEmpty();
        result.CompetitiveGaps.Should().BeEmpty();
    }

    [Fact]
    public async Task TopDomains_AggregatedAcrossWorkspace_RankedByCitationCount()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceCompetitiveQuery(30), CancellationToken.None);

        // Trustpilot: 3 (Acme) + 1 (Beta) = 4; Wikipedia: 1. Both surface.
        result.TopDomains.Should().HaveCount(2);
        result.TopDomains[0].SourceName.Should().Be("Trustpilot");
        result.TopDomains[0].CitationCount.Should().Be(4);
        result.TopDomains[0].SourceType.Should().Be("Editorial");
        result.TopDomains[1].SourceName.Should().Be("Wikipedia");
        result.TopDomains[1].CitationCount.Should().Be(1);
    }

    [Fact]
    public async Task MentionDistribution_TrackedBrandsFirst_ThenCompetitorsDeduped()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceCompetitiveQuery(30), CancellationToken.None);

        // Tracked brands first, alphabetical: Acme then Beta. Then competitors.
        result.MentionDistribution[0].Name.Should().Be("Acme");
        result.MentionDistribution[0].IsTrackedBrand.Should().BeTrue();
        result.MentionDistribution[0].MentionCount.Should().Be(4);
        result.MentionDistribution[1].Name.Should().Be("Beta");
        result.MentionDistribution[1].IsTrackedBrand.Should().BeTrue();
        result.MentionDistribution[1].MentionCount.Should().Be(3);

        var indeed = result.MentionDistribution.Single(e => e.Name == "Indeed");
        indeed.IsTrackedBrand.Should().BeFalse();
        // Shared competitor: Acme answer x2 + Beta answer x5 = 7.
        indeed.MentionCount.Should().Be(7);

        var glassdoor = result.MentionDistribution.Single(e => e.Name == "Glassdoor");
        glassdoor.MentionCount.Should().Be(1);
    }

    [Fact]
    public async Task CompetitiveGaps_PerTrackedBrand_UsesBrandScopedAnswers()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceCompetitiveQuery(30), CancellationToken.None);

        // Two tracked brand groups.
        result.CompetitiveGaps.Should().HaveCount(2);

        // Acme group: 4 brand mentions, 2 recs. Competitors in Acme's scan
        // set: Indeed (2 mentions, 1 rec), Glassdoor (1 mention, 0 rec).
        var acmeGroup = result.CompetitiveGaps.Single(g => g.TrackedBrandName == "Acme");
        acmeGroup.Gaps.Should().HaveCount(2);
        var acmeVsIndeed = acmeGroup.Gaps.Single(g => g.CompetitorName == "Indeed");
        acmeVsIndeed.BrandMentions.Should().Be(4);
        acmeVsIndeed.CompetitorMentions.Should().Be(2);
        acmeVsIndeed.MentionsGap.Should().Be(2);
        acmeVsIndeed.BrandRecommendations.Should().Be(2);
        acmeVsIndeed.CompetitorRecommendations.Should().Be(1);
        acmeVsIndeed.RecommendationsGap.Should().Be(1);

        // Beta group: 3 brand mentions, 1 rec. Competitors in Beta's scan
        // set: Indeed (5 mentions, 2 recs). Glassdoor isn't in Beta's
        // tracker, so Beta's gap section doesn't include it.
        var betaGroup = result.CompetitiveGaps.Single(g => g.TrackedBrandName == "Beta");
        betaGroup.Gaps.Should().HaveCount(1);
        var betaVsIndeed = betaGroup.Gaps.Single(g => g.CompetitorName == "Indeed");
        betaVsIndeed.BrandMentions.Should().Be(3);
        betaVsIndeed.CompetitorMentions.Should().Be(5);
        betaVsIndeed.MentionsGap.Should().Be(-2); // brand behind
        betaVsIndeed.BrandRecommendations.Should().Be(1);
        betaVsIndeed.CompetitorRecommendations.Should().Be(2);
    }

    [Fact]
    public async Task RecommendationRates_PerEntity_AcrossWorkspace()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceCompetitiveQuery(30), CancellationToken.None);

        // Acme: 4 mentions, 2 rec → 0.5.
        var acme = result.RecommendationRates.Single(r => r.Name == "Acme");
        acme.RecommendationRate.Should().BeApproximately(0.5, 1e-9);

        // Beta: 3 mentions, 1 rec → 1/3.
        var beta = result.RecommendationRates.Single(r => r.Name == "Beta");
        beta.RecommendationRate.Should().BeApproximately(1.0 / 3.0, 1e-9);

        // Indeed: 7 mentions (Acme x2 + Beta x5), 3 recs (Acme x1 + Beta x2) → 3/7.
        var indeed = result.RecommendationRates.Single(r => r.Name == "Indeed");
        indeed.MentionCount.Should().Be(7);
        indeed.RecommendationRate.Should().BeApproximately(3.0 / 7.0, 1e-9);
    }
}
