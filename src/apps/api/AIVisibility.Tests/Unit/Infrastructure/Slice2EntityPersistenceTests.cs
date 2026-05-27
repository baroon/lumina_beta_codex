using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Infrastructure;

/// <summary>
/// Slice 2 data-model tests: round-trip the analysis-output entities through
/// the configured DbContext. Uses the in-memory provider, so DB-only
/// guarantees (CHECK constraints, varchar length limits, unique-index
/// enforcement) are not exercised here — the migration file is the source of
/// truth for those. These tests verify the EF configuration: columns,
/// conversions, FK navigation, and the configured defaults from the entity
/// classes.
///
/// Phase 4 Slice 0: Citation classification + source name have moved off the
/// citation row onto the normalized Source / SourceUrl / BrandSourceClassification
/// model. These tests verify the round-trip of all four entities + the
/// SourceTypeReference seed table.
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
    public async Task Source_RoundTrips_WithDomain()
    {
        // Phase 4 Slice 0 Source: per-(source_name, domain) dedup row. Cross-
        // scan canonical row that Citation rows FK into.
        using var ctx = NewContext();

        var source = new Source
        {
            Id = Guid.NewGuid(),
            SourceName = "Acme Blog",
            Domain = "blog.acme.com",
            NormalizedDomain = "acme.com",
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Sources.Add(source);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.Sources.AsNoTracking().FirstAsync(s => s.Id == source.Id);
        reloaded.SourceName.Should().Be("Acme Blog");
        reloaded.Domain.Should().Be("blog.acme.com");
        reloaded.NormalizedDomain.Should().Be("acme.com");
    }

    [Fact]
    public async Task Source_AllowsNullDomain_ForMentionedSource()
    {
        // A "mentioned source" without URL ("according to Trustpilot") creates
        // a Source row with Domain + NormalizedDomain both null. The job dedups
        // those by lowercased SourceName instead.
        using var ctx = NewContext();

        ctx.Sources.Add(new Source
        {
            Id = Guid.NewGuid(),
            SourceName = "Trustpilot",
            Domain = null,
            NormalizedDomain = null,
            CreatedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.Sources.AsNoTracking().FirstAsync();
        reloaded.SourceName.Should().Be("Trustpilot");
        reloaded.Domain.Should().BeNull();
        reloaded.NormalizedDomain.Should().BeNull();
    }

    [Fact]
    public async Task SourceUrl_RoundTrips_AndFKNavigatesToSource()
    {
        using var ctx = NewContext();
        var source = new Source
        {
            Id = Guid.NewGuid(),
            SourceName = "Acme Blog",
            Domain = "blog.acme.com",
            NormalizedDomain = "acme.com",
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Sources.Add(source);

        var url = new SourceUrl
        {
            Id = Guid.NewGuid(),
            SourceId = source.Id,
            Url = "https://blog.acme.com/post/42",
            NormalizedUrl = "https://acme.com/post/42",
            Title = "Best widgets",
            CreatedAt = DateTime.UtcNow,
        };
        ctx.SourceUrls.Add(url);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.SourceUrls.AsNoTracking()
            .Include(u => u.Source)
            .FirstAsync(u => u.Id == url.Id);
        reloaded.Url.Should().Be("https://blog.acme.com/post/42");
        reloaded.NormalizedUrl.Should().Be("https://acme.com/post/42");
        reloaded.Title.Should().Be("Best widgets");
        reloaded.Source.SourceName.Should().Be("Acme Blog");
    }

    [Fact]
    public async Task BrandSourceClassification_RoundTrips_AllScalarFields()
    {
        // Per-(brand, source) classification — same source can be Owned for
        // brand A and ThirdParty for brand B, so the row is brand-scoped.
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var source = new Source
        {
            Id = Guid.NewGuid(),
            SourceName = "Acme Blog",
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.Sources.Add(source);

        var classification = new BrandSourceClassification
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            SourceId = source.Id,
            SourceType = SourceType.Owned,
            ConfidenceScore = 0.95,
            ProvenanceSource = ClassificationSource.RuleBased,
            Status = ClassificationStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        ctx.BrandSourceClassifications.Add(classification);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.BrandSourceClassifications.AsNoTracking()
            .FirstAsync(c => c.Id == classification.Id);
        reloaded.BrandId.Should().Be(brand.Id);
        reloaded.SourceId.Should().Be(source.Id);
        reloaded.SourceType.Should().Be(SourceType.Owned);
        reloaded.ProvenanceSource.Should().Be(ClassificationSource.RuleBased);
        reloaded.Status.Should().Be(ClassificationStatus.Active);
        reloaded.ConfidenceScore.Should().BeApproximately(0.95, 1e-9);
    }

    [Fact]
    public async Task Citation_RoundTrips_WithSourceAndSourceUrlFKs()
    {
        // Phase 4 Slice 0 Citation shape: just AIAnswerId + SourceId + optional
        // SourceUrlId + CitationType + ConfidenceScore. Source name and
        // classification are no longer columns on the citation — they live on
        // Source + BrandSourceClassification.
        using var ctx = NewContext();
        var answer = SeedAnswer(ctx);
        var source = new Source
        {
            Id = Guid.NewGuid(),
            SourceName = "Acme Blog",
            Domain = "blog.acme.com",
            NormalizedDomain = "acme.com",
            CreatedAt = DateTime.UtcNow,
        };
        var url = new SourceUrl
        {
            Id = Guid.NewGuid(),
            SourceId = source.Id,
            Url = "https://blog.acme.com/post/42",
            NormalizedUrl = "https://acme.com/post/42",
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Sources.Add(source);
        ctx.SourceUrls.Add(url);

        var citation = new Citation
        {
            Id = Guid.NewGuid(),
            AIAnswerId = answer.Id,
            SourceId = source.Id,
            SourceUrlId = url.Id,
            CitationType = CitationType.ExplicitUrl,
            ConfidenceScore = 0.95,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Citations.Add(citation);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.Citations.AsNoTracking()
            .Include(c => c.Source)
            .Include(c => c.SourceUrl)
            .FirstAsync(c => c.Id == citation.Id);
        reloaded.SourceId.Should().Be(source.Id);
        reloaded.SourceUrlId.Should().Be(url.Id);
        reloaded.CitationType.Should().Be(CitationType.ExplicitUrl);
        reloaded.Source.SourceName.Should().Be("Acme Blog");
        reloaded.SourceUrl!.NormalizedUrl.Should().Be("https://acme.com/post/42");
    }

    [Fact]
    public async Task Citation_AllowsNullSourceUrl_ForMentionedSource()
    {
        // D14: a "mentioned source" without URL ("according to Trustpilot")
        // has SourceUrlId null and CitationType=MentionedSource. The Source
        // row may still exist (deduped by lowercased name), but no SourceUrl.
        using var ctx = NewContext();
        var answer = SeedAnswer(ctx);
        var source = new Source
        {
            Id = Guid.NewGuid(),
            SourceName = "Trustpilot",
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Sources.Add(source);

        ctx.Citations.Add(new Citation
        {
            Id = Guid.NewGuid(),
            AIAnswerId = answer.Id,
            SourceId = source.Id,
            SourceUrlId = null,
            CitationType = CitationType.MentionedSource,
            CreatedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.Citations.AsNoTracking().FirstAsync();
        reloaded.SourceUrlId.Should().BeNull();
        reloaded.CitationType.Should().Be(CitationType.MentionedSource);
    }

    [Fact]
    public async Task SourceTypeReference_RoundTrips_AllScalarFields()
    {
        // Soft reference table for the 12-value SourceType taxonomy — seeded
        // by the migration, used by UI for display name + ordering.
        using var ctx = NewContext();

        var reference = new SourceTypeReference
        {
            Id = Guid.NewGuid(),
            Code = "Editorial",
            Name = "Editorial",
            Description = "News articles, magazine pieces, journalistic coverage.",
            DisplayOrder = 5,
        };
        ctx.SourceTypes.Add(reference);
        await ctx.SaveChangesAsync();

        var reloaded = await ctx.SourceTypes.AsNoTracking().FirstAsync(r => r.Id == reference.Id);
        reloaded.Code.Should().Be("Editorial");
        reloaded.Name.Should().Be("Editorial");
        reloaded.DisplayOrder.Should().Be(5);
    }
}
