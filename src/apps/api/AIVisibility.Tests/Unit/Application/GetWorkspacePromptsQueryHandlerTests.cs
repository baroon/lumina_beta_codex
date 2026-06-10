using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Prompts;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspacePromptsQueryHandler tests. Seeds a multi-brand multi-tracker
/// workspace with active + draft prompts and PromptRuns across an in-window
/// scan and an out-of-window scan, then asserts aggregation, sort order,
/// tracker-id intersection, and window filtering.
/// </summary>
public class GetWorkspacePromptsQueryHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = Guid.Empty;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetWorkspacePromptsQueryHandler NewHandler(AppDbContext ctx) =>
        new(ctx, new StubWorkspaceContext());

    private sealed record Seed(
        Guid AcmeId, Guid AcmeTrackerId,
        Guid BetaId, Guid BetaTrackerId,
        Guid PromptAcmeActiveId, Guid PromptAcmeDraftId, Guid PromptBetaActiveId,
        Guid LensId, Guid TopicId,
        Guid PlatformOpenAiId, Guid PlatformClaudeId,
        Guid AcmeAnswerOpenAiId, Guid AcmeAnswerClaudeId, Guid BetaAnswerOpenAiId);

    /// <summary>
    /// Two tracked brands (Acme, Beta), one tracker each. Acme has two
    /// prompts (one Active, one Draft); Beta has one Active prompt. Each
    /// Active prompt has a topic link. PromptRuns:
    ///   Acme/Active: 2 runs (OpenAI + Claude) in window
    ///   Acme/Active: 1 run (OpenAI) at -40d (out-of-window for the test)
    ///   Acme/Draft : 1 run (OpenAI) in window — handler must SKIP because Draft
    ///   Beta/Active: 1 run (OpenAI) in window
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var acme = new Brand { Id = Guid.NewGuid(), Name = "Acme" };
        var beta = new Brand { Id = Guid.NewGuid(), Name = "Beta" };
        var acmeTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = acme.Id, Brand = acme,
            Name = "Acme · US", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var betaTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = beta.Id, Brand = beta,
            Name = "Beta · US", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "category-discovery", Name = "Category Discovery" };
        var topic = new Topic
        {
            Id = Guid.NewGuid(), BrandId = acme.Id, DiscoveryRunId = Guid.NewGuid(),
            Name = "Resume builders", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var openai = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };
        var claude = new AIPlatform { Id = Guid.NewGuid(), Code = "claude", Name = "Claude", DisplayOrder = 2 };

        var promptAcmeActive = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id,
            PromptText = "What's the best resume builder?",
            LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var promptAcmeDraft = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id,
            PromptText = "Draft prompt — should not surface",
            LensId = lens.Id, Status = PromptStatus.Draft, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var promptBetaActive = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = betaTracker.Id,
            PromptText = "Top 5 resume builders 2026?",
            LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };

        ctx.Brands.Add(acme);
        ctx.Brands.Add(beta);
        ctx.TrackerConfigurations.Add(acmeTracker);
        ctx.TrackerConfigurations.Add(betaTracker);
        ctx.Lenses.Add(lens);
        ctx.Topics.Add(topic);
        ctx.AIPlatforms.Add(openai);
        ctx.AIPlatforms.Add(claude);
        ctx.Prompts.Add(promptAcmeActive);
        ctx.Prompts.Add(promptAcmeDraft);
        ctx.Prompts.Add(promptBetaActive);
        ctx.PromptTopics.Add(new PromptTopic { PromptId = promptAcmeActive.Id, TopicId = topic.Id });

        var now = DateTime.UtcNow;

        PromptRun SeedRun(Prompt p, AIPlatform platform, DateTime startedAt, DateTime completedAt, ScanRun scan)
        {
            var run = new PromptRun
            {
                Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = p.Id,
                AIPlatformId = platform.Id, Status = PromptRunStatus.Completed,
                StartedAt = startedAt, CompletedAt = completedAt,
            };
            ctx.PromptRuns.Add(run);
            return run;
        }

        AIAnswer SeedAnswer(PromptRun run, DateTime createdAt)
        {
            var answer = new AIAnswer
            {
                Id = Guid.NewGuid(), PromptRunId = run.Id,
                AnswerText = string.Empty, RawResponse = string.Empty,
                CreatedAt = createdAt,
            };
            ctx.AIAnswers.Add(answer);
            return answer;
        }

        void SeedMention(AIAnswer answer, Guid brandId, Sentiment sentiment, int count, double position)
        {
            ctx.Mentions.Add(new Mention
            {
                Id = Guid.NewGuid(), AIAnswerId = answer.Id,
                EntityType = MentionEntityType.Brand, EntityId = brandId,
                NormalizedName = string.Empty, IsRecommended = false,
                RecommendationStrength = RecommendationStrength.Unknown,
                RecommendationScore = 0.0,
                Sentiment = sentiment, SentimentScore = 0.0,
                ConfidenceScore = 1.0, EvidenceSnippet = string.Empty,
                MentionCount = count, FirstMentionPosition = position,
                CreatedAt = DateTime.UtcNow,
            });
        }

        // Acme — recent scan covering both active + draft prompts.
        var acmeScanRecent = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, TrackerConfiguration = acmeTracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = now.AddDays(-1), CompletedAt = now.AddDays(-1).AddMinutes(5),
        };
        ctx.ScanRuns.Add(acmeScanRecent);
        var acmeRunOpenAi = SeedRun(promptAcmeActive, openai, now.AddDays(-1), now.AddDays(-1).AddMinutes(5), acmeScanRecent);
        var acmeRunClaude = SeedRun(promptAcmeActive, claude, now.AddDays(-1), now.AddDays(-1).AddMinutes(5), acmeScanRecent);
        SeedRun(promptAcmeDraft, openai, now.AddDays(-1), now.AddDays(-1).AddMinutes(5), acmeScanRecent);

        // Answers + mentions for Acme. Two answers in window.
        //   A1 (openai): Acme/Positive (count 1, pos 0.2) + Beta-brand/Negative
        //                (count 5, pos 0.1) — the Beta mention is contamination
        //                we expect the handler to filter out for Acme's row.
        //   A2 (claude): Acme/Neutral  (count 2, pos 0.5)
        // Both answers contain an Acme mention → visibility = 2/2 = 1.0.
        // MentionCount = 1 + 2 = 3 (Beta excluded).
        // Sentiment ties 1-1 between Positive/Neutral → enum-ordinal tie-break
        // picks Positive (ordinal 0 < Neutral ordinal 1).
        // AvgPosition = (0.2 + 0.5) / 2 = 0.35.
        var acmeAnswerOpenAi = SeedAnswer(acmeRunOpenAi, now.AddDays(-1));
        var acmeAnswerClaude = SeedAnswer(acmeRunClaude, now.AddDays(-1));
        SeedMention(acmeAnswerOpenAi, acme.Id, Sentiment.Positive, count: 1, position: 0.2);
        SeedMention(acmeAnswerOpenAi, beta.Id, Sentiment.Negative, count: 5, position: 0.1);
        SeedMention(acmeAnswerClaude, acme.Id, Sentiment.Neutral, count: 2, position: 0.5);

        // Acme — old scan that lands outside the default 30-day test window.
        var acmeScanOld = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, TrackerConfiguration = acmeTracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = now.AddDays(-40), CompletedAt = now.AddDays(-40),
        };
        ctx.ScanRuns.Add(acmeScanOld);
        SeedRun(promptAcmeActive, openai, now.AddDays(-40), now.AddDays(-40), acmeScanOld);

        // Beta — recent scan, one run on OpenAI.
        var betaScanRecent = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = betaTracker.Id, TrackerConfiguration = betaTracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = now.AddDays(-2), CompletedAt = now.AddDays(-2).AddMinutes(10),
        };
        ctx.ScanRuns.Add(betaScanRecent);
        var betaRunOpenAi = SeedRun(promptBetaActive, openai, now.AddDays(-2), now.AddDays(-2).AddMinutes(10), betaScanRecent);

        // Beta: single in-window answer with one Beta-brand Neutral mention
        // (count 2, pos 0.5). Visibility 1.0, mention count 2, sentiment
        // "Neutral", avg pos 0.5.
        var betaAnswerOpenAi = SeedAnswer(betaRunOpenAi, now.AddDays(-2));
        SeedMention(betaAnswerOpenAi, beta.Id, Sentiment.Neutral, count: 2, position: 0.5);

        ctx.SaveChanges();
        return new Seed(
            acme.Id, acmeTracker.Id, beta.Id, betaTracker.Id,
            promptAcmeActive.Id, promptAcmeDraft.Id, promptBetaActive.Id,
            lens.Id, topic.Id, openai.Id, claude.Id,
            acmeAnswerOpenAi.Id, acmeAnswerClaude.Id, betaAnswerOpenAi.Id);
    }

    [Fact]
    public async Task ReturnsEmpty_WhenWorkspaceHasNoBrands()
    {
        using var ctx = NewContext();
        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);
        result.Prompts.Should().BeEmpty();
    }

    [Fact]
    public async Task SurfacesActivePrompts_AcrossWorkspaceTrackers()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        // 2 Active prompts surface (Acme + Beta). The Draft prompt is dropped.
        result.Prompts.Should().HaveCount(2);
        result.Prompts.Should().NotContain(p => p.PromptId == seed.PromptAcmeDraftId);

        var acme = result.Prompts.Single(p => p.PromptId == seed.PromptAcmeActiveId);
        acme.TrackerId.Should().Be(seed.AcmeTrackerId);
        acme.TrackerName.Should().Be("Acme · US");
        acme.BrandId.Should().Be(seed.AcmeId);
        acme.BrandName.Should().Be("Acme");
        acme.LensName.Should().Be("Category Discovery");
        acme.Topics.Should().ContainSingle().Which.Should().Be("Resume builders");
    }

    [Fact]
    public async Task AggregatesScanCountAndPlatformsAcrossInWindowRuns()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        var acme = result.Prompts.Single(p => p.PromptId == seed.PromptAcmeActiveId);
        // Only the recent scan lands in the 30-day window — the -40d scan
        // drops out. So 1 distinct scan, 2 distinct platforms.
        acme.ScanCount.Should().Be(1);
        acme.PlatformCodes.Should().BeEquivalentTo(new[] { "claude", "openai" });
        acme.LastScanAt.Should().NotBeNull();
    }

    [Fact]
    public async Task TrackerIdsFilter_NarrowsToSubsetOfWorkspaceTrackers()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(
                DateTime.UtcNow.AddDays(-30), null,
                TrackerIds: new[] { seed.BetaTrackerId }),
            CancellationToken.None);

        result.Prompts.Should().ContainSingle()
            .Which.PromptId.Should().Be(seed.PromptBetaActiveId);
    }

    [Fact]
    public async Task TrackerIdsFilter_IgnoresUnknownIdsForSecurity()
    {
        using var ctx = NewContext();
        Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(
                DateTime.UtcNow.AddDays(-30), null,
                TrackerIds: new[] { Guid.NewGuid() }),
            CancellationToken.None);

        // Caller passed a GUID outside the workspace's trackers; intersection
        // yields the empty set → no prompts leak from other workspaces.
        result.Prompts.Should().BeEmpty();
    }

    [Fact]
    public async Task PromptWithNoRunsInWindow_StillSurfacesWithZeroScanCount()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // 1-day window — Beta's -2d scan drops out so its prompt has no runs
        // in window. The prompt should still appear (it's Active) but with
        // ScanCount=0 and LastScanAt=null.
        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(DateTime.UtcNow.AddHours(-12), null, null),
            CancellationToken.None);

        var beta = result.Prompts.Single(p => p.PromptId == seed.PromptBetaActiveId);
        beta.ScanCount.Should().Be(0);
        beta.LastScanAt.Should().BeNull();
        beta.PlatformCodes.Should().BeEmpty();
    }

    [Fact]
    public async Task ComputesAnalyticalColumns_FromInWindowAnswerMentions()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        var acme = result.Prompts.Single(p => p.PromptId == seed.PromptAcmeActiveId);
        // Both in-window answers contain an Acme mention → 2/2 = 1.0.
        acme.VisibilityRate.Should().Be(1.0);
        // Sum of MentionCount across Acme mentions (1 + 2). Beta mention
        // on A1 is filtered out by the prompt-brand intersection.
        acme.BrandMentionCount.Should().Be(3);
        // 1 Positive + 1 Neutral → tie, broken by enum ordinal (Positive=0).
        acme.DominantSentiment.Should().Be("Positive");
        // (0.2 + 0.5) / 2.
        acme.AverageFirstMentionPosition.Should().BeApproximately(0.35, 1e-9);

        var beta = result.Prompts.Single(p => p.PromptId == seed.PromptBetaActiveId);
        beta.VisibilityRate.Should().Be(1.0);
        beta.BrandMentionCount.Should().Be(2);
        beta.DominantSentiment.Should().Be("Neutral");
        beta.AverageFirstMentionPosition.Should().BeApproximately(0.5, 1e-9);
    }

    [Fact]
    public async Task AnalyticalColumns_AreNull_WhenNoAnswersInWindow()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // 12-hour window drops Beta's -2d answer. The prompt still surfaces
        // (Active), but visibility / sentiment / position become null and
        // mention count 0 — the "—" fallback the FE renders.
        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(DateTime.UtcNow.AddHours(-12), null, null),
            CancellationToken.None);

        var beta = result.Prompts.Single(p => p.PromptId == seed.PromptBetaActiveId);
        beta.VisibilityRate.Should().BeNull();
        beta.BrandMentionCount.Should().Be(0);
        beta.DominantSentiment.Should().BeNull();
        beta.AverageFirstMentionPosition.Should().BeNull();
    }

    [Fact]
    public async Task CrossBrandMention_OnSameAnswer_DoesNotContaminatePromptRow()
    {
        // Acme's openai answer contains a Beta-brand mention (count 5)
        // alongside the Acme mention (count 1). Acme's row should reflect
        // only the Acme mention (count 1 + Acme/claude's count 2 = 3).
        // The contamination filter is what keeps BrandMentionCount at 3
        // rather than 8.
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        var acme = result.Prompts.Single(p => p.PromptId == seed.PromptAcmeActiveId);
        acme.BrandMentionCount.Should().Be(3);
    }

    [Fact]
    public async Task Sorts_PromptsByLastScanDescendingThenName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspacePromptsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        // Acme scan completed -1d + 5min; Beta scan completed -2d + 10min.
        // Acme is more recent → should sort first.
        result.Prompts.Select(p => p.PromptId)
            .Should().ContainInOrder(seed.PromptAcmeActiveId, seed.PromptBetaActiveId);
    }
}
