using AIVisibility.Application.Queries.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetTrackerCompetitiveQueryHandler tests (Phase 4 v2 Slice B). Verifies
/// top domains aggregation, domain types breakdown, mention distribution
/// + SoV shares, competitive gap math, recommendation rate per entity.
/// </summary>
public class GetTrackerCompetitiveQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid TrackerId, Guid BrandId, Guid GenslerId, Guid HokId,
        Guid AnswerId, Guid TrustpilotId, Guid WikipediaId);

    /// <summary>
    /// Fixture: tracker with one brand + 2 tracked competitors + 1 scan with
    /// 1 answer carrying enough mentions/citations to exercise the math.
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Nostri" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var gensler = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Gensler", Domain = "gensler.com" };
        var hok = new Competitor { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "HOK", Domain = "hok.com" };
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "OpenAI" };
        var prompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, PromptText = "p", LensId = Guid.NewGuid(), Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow.AddDays(-1), CompletedAt = DateTime.UtcNow.AddDays(-1) };
        var run = new PromptRun { Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id, AIPlatformId = platform.Id, Status = PromptRunStatus.Completed, StartedAt = DateTime.UtcNow.AddDays(-1) };
        var answer = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = run.Id, AnswerText = "a", CreatedAt = DateTime.UtcNow.AddDays(-1) };
        var signal = new AnswerSignal { Id = Guid.NewGuid(), AIAnswerId = answer.Id, CreatedAt = DateTime.UtcNow.AddDays(-1) };

        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.Competitors.Add(gensler);
        ctx.Competitors.Add(hok);
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, CompetitorId = gensler.Id });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, CompetitorId = hok.Id });
        ctx.AIPlatforms.Add(platform);
        ctx.Prompts.Add(prompt);
        ctx.ScanRuns.Add(scan);
        ctx.PromptRuns.Add(run);
        ctx.AIAnswers.Add(answer);
        ctx.AnswerSignals.Add(signal);

        // Mentions: 5 brand, 3 gensler (1 recommended), 2 HOK (0 recommended).
        // Brand recs: 2.
        for (var i = 0; i < 5; i++)
        {
            ctx.Mentions.Add(NewMention(answer.Id, MentionEntityType.Brand, brand.Id, i < 2));
        }
        for (var i = 0; i < 3; i++)
        {
            ctx.Mentions.Add(NewMention(answer.Id, MentionEntityType.Competitor, gensler.Id, i == 0));
        }
        for (var i = 0; i < 2; i++)
        {
            ctx.Mentions.Add(NewMention(answer.Id, MentionEntityType.Competitor, hok.Id, false));
        }

        // Citations: 4 Trustpilot (Editorial), 1 Wikipedia (Reference) =
        // 5 total. Trustpilot dominates top domains; Editorial 80%, Reference 20%.
        var trustpilot = new Source { Id = Guid.NewGuid(), SourceName = "Trustpilot", Domain = "trustpilot.com", NormalizedDomain = "trustpilot.com", CreatedAt = DateTime.UtcNow };
        var wikipedia = new Source { Id = Guid.NewGuid(), SourceName = "Wikipedia", Domain = "en.wikipedia.org", NormalizedDomain = "en.wikipedia.org", CreatedAt = DateTime.UtcNow };
        ctx.Sources.Add(trustpilot);
        ctx.Sources.Add(wikipedia);
        ctx.BrandSourceClassifications.Add(new BrandSourceClassification
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, SourceId = trustpilot.Id,
            SourceType = SourceType.Editorial, ConfidenceScore = 0.9,
            ProvenanceSource = ClassificationSource.LLMClassified, Status = ClassificationStatus.Active,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        ctx.BrandSourceClassifications.Add(new BrandSourceClassification
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, SourceId = wikipedia.Id,
            SourceType = SourceType.Reference, ConfidenceScore = 0.9,
            ProvenanceSource = ClassificationSource.LLMClassified, Status = ClassificationStatus.Active,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        for (var i = 0; i < 4; i++)
        {
            ctx.Citations.Add(NewCitation(answer.Id, trustpilot.Id));
        }
        ctx.Citations.Add(NewCitation(answer.Id, wikipedia.Id));

        ctx.SaveChanges();
        return new Seed(tracker.Id, brand.Id, gensler.Id, hok.Id, answer.Id, trustpilot.Id, wikipedia.Id);
    }

    private static Mention NewMention(Guid answerId, MentionEntityType type, Guid entityId, bool recommended) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId,
        EntityType = type, EntityId = entityId,
        NormalizedName = "n", EvidenceSnippet = "e",
        IsRecommended = recommended,
        CreatedAt = DateTime.UtcNow,
    };

    private static Citation NewCitation(Guid answerId, Guid sourceId) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId, SourceId = sourceId,
        CitationType = CitationType.ExplicitUrl, CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task ReturnsNull_WhenTrackerDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetTrackerCompetitiveQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerCompetitiveQuery(Guid.NewGuid(), 30), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsEmptyAggregations_WhenWindowHasNoAnswers()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.SaveChanges();

        var sut = new GetTrackerCompetitiveQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerCompetitiveQuery(tracker.Id, 30), CancellationToken.None);

        result.Should().NotBeNull();
        result!.TopDomains.Should().BeEmpty();
        result.MentionDistribution.Should().BeEmpty();
        result.CompetitiveGaps.Should().BeEmpty();
    }

    [Fact]
    public async Task TopDomains_RankedByCitationCountDesc_WithTypeChip()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerCompetitiveQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerCompetitiveQuery(seed.TrackerId, 30), CancellationToken.None);

        result!.TopDomains.Should().HaveCount(2);
        var trustpilot = result.TopDomains[0];
        trustpilot.SourceName.Should().Be("Trustpilot");
        trustpilot.CitationCount.Should().Be(4);
        trustpilot.SourceType.Should().Be("Editorial");
        trustpilot.CitationRate.Should().BeApproximately(0.8, 1e-9);

        var wikipedia = result.TopDomains[1];
        wikipedia.SourceName.Should().Be("Wikipedia");
        wikipedia.CitationCount.Should().Be(1);
        wikipedia.SourceType.Should().Be("Reference");
    }

    [Fact]
    public async Task DomainTypes_BreakdownByType_WithShares()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerCompetitiveQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerCompetitiveQuery(seed.TrackerId, 30), CancellationToken.None);

        result!.DomainTypes.Should().HaveCount(2);
        var editorial = result.DomainTypes.Single(t => t.SourceType == "Editorial");
        editorial.CitationCount.Should().Be(4);
        editorial.Share.Should().BeApproximately(0.8, 1e-9);
        var reference = result.DomainTypes.Single(t => t.SourceType == "Reference");
        reference.Share.Should().BeApproximately(0.2, 1e-9);
    }

    [Fact]
    public async Task MentionDistribution_OneRowPerTrackedEntity_WithShares_TrackedBrandFirst()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerCompetitiveQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerCompetitiveQuery(seed.TrackerId, 30), CancellationToken.None);

        // 3 entities: Brand + Gensler + HOK. Tracked brand first.
        result!.MentionDistribution.Should().HaveCount(3);
        result.MentionDistribution[0].IsTrackedBrand.Should().BeTrue();
        result.MentionDistribution[0].Name.Should().Be("Nostri");
        result.MentionDistribution[0].MentionCount.Should().Be(5);
        // Total mentions = 5 + 3 + 2 = 10. Brand share = 0.5.
        result.MentionDistribution[0].Share.Should().BeApproximately(0.5, 1e-9);

        var gensler = result.MentionDistribution.Single(e => e.Name == "Gensler");
        gensler.MentionCount.Should().Be(3);
        gensler.Share.Should().BeApproximately(0.3, 1e-9);

        var hok = result.MentionDistribution.Single(e => e.Name == "HOK");
        hok.MentionCount.Should().Be(2);
    }

    [Fact]
    public async Task CompetitiveGaps_PerCompetitor_BrandAheadOnMentionsAndRecs()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerCompetitiveQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerCompetitiveQuery(seed.TrackerId, 30), CancellationToken.None);

        // Two competitors → two gap rows. Brand: 5 mentions / 2 recs.
        // Gensler: 3 mentions / 1 rec. HOK: 2 mentions / 0 recs.
        result!.CompetitiveGaps.Should().HaveCount(2);

        var vsGensler = result.CompetitiveGaps.Single(g => g.CompetitorName == "Gensler");
        vsGensler.BrandMentions.Should().Be(5);
        vsGensler.CompetitorMentions.Should().Be(3);
        vsGensler.MentionsGap.Should().Be(2);
        vsGensler.BrandRecommendations.Should().Be(2);
        vsGensler.CompetitorRecommendations.Should().Be(1);
        vsGensler.RecommendationsGap.Should().Be(1);

        var vsHok = result.CompetitiveGaps.Single(g => g.CompetitorName == "HOK");
        vsHok.MentionsGap.Should().Be(3); // 5 - 2
        vsHok.RecommendationsGap.Should().Be(2);
    }

    [Fact]
    public async Task RecommendationRates_PerEntity_NullWhenNoMentions()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerCompetitiveQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerCompetitiveQuery(seed.TrackerId, 30), CancellationToken.None);

        var brand = result!.RecommendationRates.Single(r => r.IsTrackedBrand);
        brand.MentionCount.Should().Be(5);
        brand.RecommendationRate.Should().BeApproximately(2.0 / 5.0, 1e-9);

        var gensler = result.RecommendationRates.Single(r => r.Name == "Gensler");
        gensler.RecommendationRate.Should().BeApproximately(1.0 / 3.0, 1e-9);

        var hok = result.RecommendationRates.Single(r => r.Name == "HOK");
        hok.RecommendationRate.Should().Be(0.0); // 0 recs / 2 mentions
    }

    [Fact]
    public async Task UntrackedCompetitorMentions_AreExcluded()
    {
        // A Mention with EntityType=Competitor + an EntityId NOT in
        // TrackerCompetitor (e.g. an LLM-named entity the resolver
        // promoted) should not appear in the distribution.
        using var ctx = NewContext();
        var seed = Build(ctx);
        var untrackedId = Guid.NewGuid();
        var answer = ctx.AIAnswers.AsTracking().First();
        ctx.Mentions.Add(NewMention(answer.Id, MentionEntityType.Competitor, untrackedId, false));
        ctx.SaveChanges();

        var sut = new GetTrackerCompetitiveQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerCompetitiveQuery(seed.TrackerId, 30), CancellationToken.None);

        // Still 3 distribution rows — untracked competitor is silently dropped.
        result!.MentionDistribution.Should().HaveCount(3);
        result.MentionDistribution.Should().NotContain(e => e.EntityId == untrackedId);
    }
}
