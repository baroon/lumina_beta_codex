using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Prompts;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetPromptAnswerHistoryQueryHandler tests. Seeds a single tracked
/// prompt with two in-window scans (OpenAI + Claude, one with brand
/// mentions and one without) plus a foreign-workspace prompt to prove
/// authorization scoping.
/// </summary>
public class GetPromptAnswerHistoryQueryHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = Guid.Empty;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetPromptAnswerHistoryQueryHandler NewHandler(
        AppDbContext ctx, Guid workspaceId) =>
        new(ctx, new StubWorkspaceContext { WorkspaceId = workspaceId });

    private sealed record Seed(
        Guid WorkspaceId,
        Guid AcmePromptId,
        Guid ForeignPromptId,
        Guid AcmeAnswerOpenAiId,
        Guid AcmeAnswerClaudeId,
        Guid ScanRunId);

    /// <summary>
    /// Acme owns one tracker + one prompt, scanned once in window across
    /// two platforms. The OpenAI answer carries two brand mentions and
    /// one competitor mention (which should NOT bleed into the row);
    /// the Claude answer has no brand mention at all. A foreign brand
    /// in another workspace owns a separate prompt so we can prove the
    /// handler refuses to return it under the Acme workspace.
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var workspaceId = Guid.NewGuid();
        var foreignWorkspaceId = Guid.NewGuid();

        var acme = new Brand { Id = Guid.NewGuid(), Name = "Acme", WorkspaceId = workspaceId };
        var competitor = new Brand { Id = Guid.NewGuid(), Name = "Competitor", WorkspaceId = workspaceId };
        var foreign = new Brand { Id = Guid.NewGuid(), Name = "Foreign", WorkspaceId = foreignWorkspaceId };
        var acmeTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = acme.Id, Brand = acme,
            Name = "Acme · US", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var foreignTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = foreign.Id, Brand = foreign,
            Name = "Foreign · UK", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "category-discovery", Name = "Category Discovery" };
        var openai = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };
        var claude = new AIPlatform { Id = Guid.NewGuid(), Code = "claude", Name = "Claude", DisplayOrder = 2 };

        var acmePrompt = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id,
            PromptText = "Best resume builder?",
            LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var foreignPrompt = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = foreignTracker.Id,
            PromptText = "Foreign prompt",
            LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };

        ctx.Brands.AddRange(acme, competitor, foreign);
        ctx.TrackerConfigurations.AddRange(acmeTracker, foreignTracker);
        ctx.Lenses.Add(lens);
        ctx.AIPlatforms.AddRange(openai, claude);
        ctx.Prompts.AddRange(acmePrompt, foreignPrompt);

        var now = DateTime.UtcNow;
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, TrackerConfiguration = acmeTracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = now.AddDays(-1), CompletedAt = now.AddDays(-1).AddMinutes(5),
        };
        ctx.ScanRuns.Add(scan);

        var openaiRun = new PromptRun
        {
            Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = acmePrompt.Id,
            AIPlatformId = openai.Id, Status = PromptRunStatus.Completed,
            StartedAt = scan.StartedAt, CompletedAt = scan.CompletedAt,
        };
        var claudeRun = new PromptRun
        {
            Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = acmePrompt.Id,
            AIPlatformId = claude.Id, Status = PromptRunStatus.Completed,
            StartedAt = scan.StartedAt, CompletedAt = scan.CompletedAt,
        };
        ctx.PromptRuns.AddRange(openaiRun, claudeRun);

        var openaiAnswer = new AIAnswer
        {
            Id = Guid.NewGuid(), PromptRunId = openaiRun.Id,
            AnswerText = "Acme is great. Competitor is also notable.",
            RawResponse = string.Empty, CreatedAt = now.AddDays(-1),
        };
        var claudeAnswer = new AIAnswer
        {
            Id = Guid.NewGuid(), PromptRunId = claudeRun.Id,
            AnswerText = "Generic answer with no brand mention.",
            RawResponse = string.Empty, CreatedAt = now.AddDays(-1),
        };
        ctx.AIAnswers.AddRange(openaiAnswer, claudeAnswer);

        // Mentions on the OpenAI answer:
        //   - Brand mention 1: Positive, count 3, pos 0.10, snippet "Acme is great."
        //   - Brand mention 2: Neutral, count 1, pos 0.40, snippet ""    (empty → skipped for snippet pick)
        //   - Competitor mention:                                       (filtered OUT — wrong entity)
        // Rolled-up row should report:
        //   BrandMentionCount = 4 (3+1), DominantSentiment = "Positive" (mode),
        //   FirstMentionPosition = 0.10 (min), EvidenceSnippet = "Acme is great."
        ctx.Mentions.Add(new Mention
        {
            Id = Guid.NewGuid(), AIAnswerId = openaiAnswer.Id,
            EntityType = MentionEntityType.Brand, EntityId = acme.Id,
            NormalizedName = "Acme", IsRecommended = false,
            RecommendationStrength = RecommendationStrength.Unknown,
            RecommendationScore = 0.0,
            Sentiment = Sentiment.Positive, SentimentScore = 0.0,
            ConfidenceScore = 1.0, EvidenceSnippet = "Acme is great.",
            MentionCount = 3, FirstMentionPosition = 0.10,
            CreatedAt = DateTime.UtcNow,
        });
        ctx.Mentions.Add(new Mention
        {
            Id = Guid.NewGuid(), AIAnswerId = openaiAnswer.Id,
            EntityType = MentionEntityType.Brand, EntityId = acme.Id,
            NormalizedName = "Acme", IsRecommended = false,
            RecommendationStrength = RecommendationStrength.Unknown,
            RecommendationScore = 0.0,
            Sentiment = Sentiment.Neutral, SentimentScore = 0.0,
            ConfidenceScore = 1.0, EvidenceSnippet = string.Empty,
            MentionCount = 1, FirstMentionPosition = 0.40,
            CreatedAt = DateTime.UtcNow,
        });
        ctx.Mentions.Add(new Mention
        {
            Id = Guid.NewGuid(), AIAnswerId = openaiAnswer.Id,
            EntityType = MentionEntityType.Brand, EntityId = competitor.Id,
            NormalizedName = "Competitor", IsRecommended = false,
            RecommendationStrength = RecommendationStrength.Unknown,
            RecommendationScore = 0.0,
            Sentiment = Sentiment.Negative, SentimentScore = 0.0,
            ConfidenceScore = 1.0, EvidenceSnippet = "Competitor is bad.",
            MentionCount = 7, FirstMentionPosition = 0.55,
            CreatedAt = DateTime.UtcNow,
        });

        ctx.SaveChanges();
        return new Seed(
            workspaceId,
            acmePrompt.Id, foreignPrompt.Id,
            openaiAnswer.Id, claudeAnswer.Id,
            scan.Id);
    }

    [Fact]
    public async Task ReturnsOneRowPerAnswer_WithBrandMentionRollupOnEachRow()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx, seed.WorkspaceId).Handle(
            new GetPromptAnswerHistoryQuery(seed.AcmePromptId, DateTime.UtcNow.AddDays(-30), null),
            CancellationToken.None);

        result.PromptId.Should().Be(seed.AcmePromptId);
        result.PromptText.Should().Be("Best resume builder?");
        result.Answers.Should().HaveCount(2);

        var openai = result.Answers.Single(a => a.AnswerId == seed.AcmeAnswerOpenAiId);
        openai.PlatformCode.Should().Be("openai");
        openai.PlatformName.Should().Be("ChatGPT");
        openai.AnswerText.Should().Be("Acme is great. Competitor is also notable.");
        // 3 + 1 brand mentions, competitor's 7 filtered out.
        openai.BrandMentionCount.Should().Be(4);
        // Mode of {Positive×1, Neutral×1} ties → ordinal tie-break picks Positive (ordinal 0 < Neutral 1).
        openai.DominantSentiment.Should().Be("Positive");
        // Min position across brand mentions.
        openai.FirstMentionPosition.Should().Be(0.10);
        // First non-empty snippet (the Neutral mention's empty snippet is skipped).
        openai.EvidenceSnippet.Should().Be("Acme is great.");

        var claude = result.Answers.Single(a => a.AnswerId == seed.AcmeAnswerClaudeId);
        claude.PlatformCode.Should().Be("claude");
        claude.BrandMentionCount.Should().Be(0);
        claude.DominantSentiment.Should().BeNull();
        claude.FirstMentionPosition.Should().BeNull();
        claude.EvidenceSnippet.Should().BeNull();
    }

    [Fact]
    public async Task AnswersAreSortedNewestFirst()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // Add an older OpenAI answer on a scan a week ago to prove sort order.
        var weekAgoScan = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = ctx.TrackerConfigurations.Single(t => t.Name == "Acme · US").Id,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-7), CompletedAt = DateTime.UtcNow.AddDays(-7),
        };
        ctx.ScanRuns.Add(weekAgoScan);
        var olderRun = new PromptRun
        {
            Id = Guid.NewGuid(), ScanRunId = weekAgoScan.Id, PromptId = seed.AcmePromptId,
            AIPlatformId = ctx.AIPlatforms.Single(p => p.Code == "openai").Id,
            Status = PromptRunStatus.Completed,
            StartedAt = weekAgoScan.StartedAt, CompletedAt = weekAgoScan.CompletedAt,
        };
        ctx.PromptRuns.Add(olderRun);
        var olderAnswer = new AIAnswer
        {
            Id = Guid.NewGuid(), PromptRunId = olderRun.Id,
            AnswerText = "Older answer.", RawResponse = string.Empty,
            CreatedAt = weekAgoScan.StartedAt,
        };
        ctx.AIAnswers.Add(olderAnswer);
        ctx.SaveChanges();

        var result = await NewHandler(ctx, seed.WorkspaceId).Handle(
            new GetPromptAnswerHistoryQuery(seed.AcmePromptId, DateTime.UtcNow.AddDays(-30), null),
            CancellationToken.None);

        result.Answers.Should().HaveCount(3);
        // Newest scan (the original yesterday-scan) first; the older one drops to the bottom.
        result.Answers.Last().AnswerId.Should().Be(olderAnswer.Id);
    }

    [Fact]
    public async Task ScansOutsideTheWindow_AreExcluded()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // 12-hour window — the seeded yesterday-scan drops out → no answers.
        var result = await NewHandler(ctx, seed.WorkspaceId).Handle(
            new GetPromptAnswerHistoryQuery(seed.AcmePromptId, DateTime.UtcNow.AddHours(-12), null),
            CancellationToken.None);

        result.PromptText.Should().Be("Best resume builder?");
        result.Answers.Should().BeEmpty();
    }

    [Fact]
    public async Task ForeignWorkspacePrompt_ReturnsEmptyResultWithoutLeakingText()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // Caller is in Acme's workspace; ForeignPromptId belongs to a brand
        // in a different workspace. The handler must return an empty result
        // with EMPTY PromptText — no 404, no enumeration leak via the body.
        var result = await NewHandler(ctx, seed.WorkspaceId).Handle(
            new GetPromptAnswerHistoryQuery(seed.ForeignPromptId, DateTime.UtcNow.AddDays(-30), null),
            CancellationToken.None);

        result.PromptId.Should().Be(seed.ForeignPromptId);
        result.PromptText.Should().BeEmpty();
        result.Answers.Should().BeEmpty();
    }

    [Fact]
    public async Task UnknownPromptId_ReturnsEmptyResult()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx, seed.WorkspaceId).Handle(
            new GetPromptAnswerHistoryQuery(Guid.NewGuid(), DateTime.UtcNow.AddDays(-30), null),
            CancellationToken.None);

        result.PromptText.Should().BeEmpty();
        result.Answers.Should().BeEmpty();
    }
}
