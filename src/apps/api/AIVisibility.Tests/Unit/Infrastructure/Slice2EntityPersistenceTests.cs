using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Infrastructure;

/// <summary>
/// Slice 2 data-model tests: round-trip the four new entities through the
/// configured DbContext. Uses the in-memory provider, so DB-only guarantees
/// (the CHECK constraint, varchar length limits, unique-index enforcement)
/// are not exercised here — the migration file is the source of truth for
/// those. These tests verify the EF configuration: columns, conversions,
/// FK navigation, and the configured defaults from the entity classes.
/// </summary>
public class Slice2EntityPersistenceTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static AIAnswer SeedAnswer(AppDbContext ctx)
    {
        // Minimum chain to satisfy AIAnswer's required FKs.
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(),
            BrandId = Guid.NewGuid(),
            Name = "T",
            Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow,
        };
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            TriggerType = ScanTriggerType.Manual,
            Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow,
        };
        var prompt = new Prompt
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            PromptText = "p",
            LensId = Guid.NewGuid(),
            Status = PromptStatus.Active,
            Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var platform = new AIPlatform
        {
            Id = Guid.NewGuid(),
            Code = "openai",
            Name = "OpenAI",
        };
        var promptRun = new PromptRun
        {
            Id = Guid.NewGuid(),
            ScanRunId = scan.Id,
            PromptId = prompt.Id,
            AIPlatformId = platform.Id,
            Status = PromptRunStatus.Completed,
            StartedAt = DateTime.UtcNow,
        };
        var answer = new AIAnswer
        {
            Id = Guid.NewGuid(),
            PromptRunId = promptRun.Id,
            AnswerText = "raw",
            CreatedAt = DateTime.UtcNow,
        };

        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);
        ctx.Prompts.Add(prompt);
        ctx.AIPlatforms.Add(platform);
        ctx.PromptRuns.Add(promptRun);
        ctx.AIAnswers.Add(answer);
        ctx.SaveChanges();
        return answer;
    }

    [Fact]
    public async Task AnswerSignal_RoundTrips_AllScalarFields()
    {
        using var ctx = NewContext();
        var answer = SeedAnswer(ctx);

        var signal = new AnswerSignal
        {
            Id = Guid.NewGuid(),
            AIAnswerId = answer.Id,
            BrandMentioned = true,
            BrandRecommended = true,
            BrandRank = 2,
            BrandSentiment = Sentiment.Positive,
            BrandRecommendationStrength = RecommendationStrength.Strong,
            TopRecommendedEntity = "Acme",
            AnswerHasRanking = true,
            AnswerHasComparison = false,
            AnswerHasCitations = true,
            OwnedSourceCount = 1,
            CompetitorSourceCount = 2,
            ThirdPartySourceCount = 3,
            ConfidenceScore = 0.87,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.AnswerSignals.Add(signal);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.AnswerSignals.AsNoTracking().FirstAsync(s => s.Id == signal.Id);
        reloaded.AIAnswerId.Should().Be(answer.Id);
        reloaded.BrandMentioned.Should().BeTrue();
        reloaded.BrandRank.Should().Be(2);
        reloaded.BrandSentiment.Should().Be(Sentiment.Positive);
        reloaded.BrandRecommendationStrength.Should().Be(RecommendationStrength.Strong);
        reloaded.TopRecommendedEntity.Should().Be("Acme");
        reloaded.OwnedSourceCount.Should().Be(1);
        reloaded.CompetitorSourceCount.Should().Be(2);
        reloaded.ThirdPartySourceCount.Should().Be(3);
        reloaded.ConfidenceScore.Should().BeApproximately(0.87, 1e-9);
    }

    [Fact]
    public async Task AnswerSignal_DefaultsBrandRank_ToNull_WhenNotSet()
    {
        // BrandRank is nullable: when the answer has no ranked list, the
        // extractor should leave it null (D11). Verify the column is configured
        // to allow null in the in-memory model too.
        using var ctx = NewContext();
        var answer = SeedAnswer(ctx);

        ctx.AnswerSignals.Add(new AnswerSignal
        {
            Id = Guid.NewGuid(),
            AIAnswerId = answer.Id,
            BrandRank = null,
            CreatedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.AnswerSignals.AsNoTracking().FirstAsync();
        reloaded.BrandRank.Should().BeNull();
        // Unset enums fall back to the entity's default (D11 — absence is Unknown).
        reloaded.BrandSentiment.Should().Be(Sentiment.Unknown);
        reloaded.BrandRecommendationStrength.Should().Be(RecommendationStrength.Unknown);
    }

    [Fact]
    public async Task Mention_RoundTrips_PolymorphicEntityFields()
    {
        using var ctx = NewContext();
        var answer = SeedAnswer(ctx);
        var competitorId = Guid.NewGuid();

        var mention = new Mention
        {
            Id = Guid.NewGuid(),
            AIAnswerId = answer.Id,
            EntityType = MentionEntityType.Competitor,
            EntityId = competitorId,
            NormalizedName = "acme",
            IsRecommended = true,
            RecommendationStrength = RecommendationStrength.Moderate,
            Sentiment = Sentiment.Neutral,
            ConfidenceScore = 0.91,
            EvidenceSnippet = "Acme is a strong choice for...",
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Mentions.Add(mention);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.Mentions.AsNoTracking().FirstAsync(m => m.Id == mention.Id);
        reloaded.EntityType.Should().Be(MentionEntityType.Competitor);
        reloaded.EntityId.Should().Be(competitorId);
        reloaded.NormalizedName.Should().Be("acme");
        reloaded.RecommendationStrength.Should().Be(RecommendationStrength.Moderate);
        reloaded.Sentiment.Should().Be(Sentiment.Neutral);
        reloaded.EvidenceSnippet.Should().StartWith("Acme");
    }

    [Fact]
    public async Task MentionCandidate_RoundTrips_AndPreservesClaimedNameDistinctFromNormalized()
    {
        using var ctx = NewContext();
        var answer = SeedAnswer(ctx);

        var candidate = new MentionCandidate
        {
            Id = Guid.NewGuid(),
            AIAnswerId = answer.Id,
            ClaimedEntityType = MentionEntityType.Competitor,
            ClaimedName = "Acme Corp.",
            NormalizedName = "acme corp",
            EvidenceSnippet = "...also Acme Corp. is mentioned...",
            ConfidenceScore = 0.42,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.MentionCandidates.Add(candidate);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.MentionCandidates.AsNoTracking().FirstAsync(c => c.Id == candidate.Id);
        reloaded.ClaimedEntityType.Should().Be(MentionEntityType.Competitor);
        reloaded.ClaimedName.Should().Be("Acme Corp.");
        reloaded.NormalizedName.Should().Be("acme corp");
    }

    [Fact]
    public async Task Citation_RoundTrips_WithExplicitUrl()
    {
        using var ctx = NewContext();
        var answer = SeedAnswer(ctx);

        var citation = new Citation
        {
            Id = Guid.NewGuid(),
            AIAnswerId = answer.Id,
            SourceName = "Acme Blog",
            NormalizedSourceName = "acme blog",
            Url = "https://blog.acme.com/post/42",
            NormalizedDomain = "acme.com",
            Classification = SourceClassification.Owned,
            CitationType = CitationType.ExplicitUrl,
            ConfidenceScore = 0.95,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Citations.Add(citation);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.Citations.AsNoTracking().FirstAsync(c => c.Id == citation.Id);
        reloaded.SourceName.Should().Be("Acme Blog");
        reloaded.NormalizedDomain.Should().Be("acme.com");
        reloaded.Classification.Should().Be(SourceClassification.Owned);
        reloaded.CitationType.Should().Be(CitationType.ExplicitUrl);
    }

    [Fact]
    public async Task Citation_AllowsNullUrl_ForMentionedSource()
    {
        // D14: a "mentioned source" without URL has url + normalized_domain
        // null and citation_type=MentionedSource. Classification defaults to
        // Unknown because URL-domain matching can't run.
        using var ctx = NewContext();
        var answer = SeedAnswer(ctx);

        ctx.Citations.Add(new Citation
        {
            Id = Guid.NewGuid(),
            AIAnswerId = answer.Id,
            SourceName = "Trustpilot",
            NormalizedSourceName = "trustpilot",
            Url = null,
            NormalizedDomain = null,
            Classification = SourceClassification.Unknown,
            CitationType = CitationType.MentionedSource,
            CreatedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.Citations.AsNoTracking().FirstAsync();
        reloaded.Url.Should().BeNull();
        reloaded.NormalizedDomain.Should().BeNull();
        reloaded.CitationType.Should().Be(CitationType.MentionedSource);
    }
}
