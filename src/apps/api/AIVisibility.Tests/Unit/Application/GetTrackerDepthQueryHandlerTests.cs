using AIVisibility.Application.Queries.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetTrackerDepthQueryHandler tests (Phase 4 v2 Slice C). Verifies
/// per-platform mention rates, sentiment distribution, activity heatmap
/// (platform × scan-day), topic heatmap (topic × platform), recent-chats
/// projection ordering + snippet truncation.
/// </summary>
public class GetTrackerDepthQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid TrackerId, Guid BrandId,
        Guid OpenAIId, Guid GeminiId,
        Guid LensId,
        Guid Topic1Id, Guid Topic2Id);

    /// <summary>
    /// Fixture: tracker / 2 platforms / 2 prompts (1 topic each + a shared topic) /
    /// 2 scans with answers across both platforms. Mentions seeded with mixed
    /// sentiment so the distribution exercise has substance.
    /// </summary>
    private static Seed Build(AppDbContext ctx, int answersPerScanPerPlatform = 1)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Nostri" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var openai = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };
        var gemini = new AIPlatform { Id = Guid.NewGuid(), Code = "gemini", Name = "Gemini", DisplayOrder = 2 };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "category-discovery", Name = "Category Discovery", DisplayOrder = 1 };
        var topicA = new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Architecture", Confidence = 0.9 };
        var topicB = new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Interior Design", Confidence = 0.9 };
        var prompt1 = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id,
            PromptText = "Best architecture firms for office spaces?",
            LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var prompt2 = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id,
            PromptText = "Top interior design firms in NYC",
            LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };

        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.AIPlatforms.Add(openai);
        ctx.AIPlatforms.Add(gemini);
        ctx.Lenses.Add(lens);
        ctx.Topics.Add(topicA);
        ctx.Topics.Add(topicB);
        ctx.Prompts.Add(prompt1);
        ctx.Prompts.Add(prompt2);
        ctx.PromptTopics.Add(new PromptTopic { Id = Guid.NewGuid(), PromptId = prompt1.Id, TopicId = topicA.Id });
        ctx.PromptTopics.Add(new PromptTopic { Id = Guid.NewGuid(), PromptId = prompt2.Id, TopicId = topicB.Id });
        // prompt1 also tagged with topicB so the heatmap has more than one row populated
        ctx.PromptTopics.Add(new PromptTopic { Id = Guid.NewGuid(), PromptId = prompt1.Id, TopicId = topicB.Id });

        // 2 scans at -1 day and -2 days; both have prompt1 + prompt2 × openai + gemini = 4 answers.
        var scan1Time = DateTime.UtcNow.AddDays(-2).AddMinutes(-30);
        var scan2Time = DateTime.UtcNow.AddDays(-1);
        var scan1 = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = scan1Time, CompletedAt = scan1Time.AddMinutes(5) };
        var scan2 = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = scan2Time, CompletedAt = scan2Time.AddMinutes(5) };
        ctx.ScanRuns.Add(scan1);
        ctx.ScanRuns.Add(scan2);

        var prompts = new[] { prompt1, prompt2 };
        var platforms = new[] { openai, gemini };
        var scans = new[] { scan1, scan2 };
        foreach (var scan in scans)
        {
            foreach (var prompt in prompts)
            {
                foreach (var platform in platforms)
                {
                    for (var n = 0; n < answersPerScanPerPlatform; n++)
                    {
                        var run = new PromptRun
                        {
                            Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id,
                            AIPlatformId = platform.Id, Status = PromptRunStatus.Completed,
                            StartedAt = scan.StartedAt,
                        };
                        var answer = new AIAnswer
                        {
                            Id = Guid.NewGuid(), PromptRunId = run.Id,
                            AnswerText = $"Answer for {prompt.PromptText} on {platform.Name} at scan {scan.StartedAt:O} — " +
                                new string('x', 250), // longer than truncation limit
                            CreatedAt = scan.StartedAt.AddSeconds(n),
                        };
                        ctx.PromptRuns.Add(run);
                        ctx.AIAnswers.Add(answer);
                        ctx.AnswerSignals.Add(new AnswerSignal
                        {
                            Id = Guid.NewGuid(), AIAnswerId = answer.Id, CreatedAt = DateTime.UtcNow,
                            BrandSentiment = platform.Code == "openai" ? Sentiment.Positive : Sentiment.Neutral,
                        });
                        // Brand mention on openai only, with sentiment alternating Positive / Negative
                        if (platform.Code == "openai")
                        {
                            ctx.Mentions.Add(new Mention
                            {
                                Id = Guid.NewGuid(), AIAnswerId = answer.Id,
                                EntityType = MentionEntityType.Brand, EntityId = brand.Id,
                                NormalizedName = "Nostri", EvidenceSnippet = "e",
                                IsRecommended = true,
                                Sentiment = scan == scan1 ? Sentiment.Positive : Sentiment.Negative,
                                CreatedAt = scan.StartedAt,
                            });
                        }
                    }
                }
            }
        }

        ctx.SaveChanges();
        return new Seed(tracker.Id, brand.Id, openai.Id, gemini.Id, lens.Id, topicA.Id, topicB.Id);
    }

    [Fact]
    public async Task ReturnsNull_WhenTrackerDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetTrackerDepthQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerDepthQuery(Guid.NewGuid(), 30), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsEmptyAggregations_WhenWindowHasNoScans()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.SaveChanges();

        var sut = new GetTrackerDepthQueryHandler(ctx);
        var result = await sut.Handle(new GetTrackerDepthQuery(tracker.Id, 30), CancellationToken.None);

        result.Should().NotBeNull();
        result!.MentionsByPlatform.Should().BeEmpty();
        result.SentimentDistribution.Should().BeEmpty();
        result.ActivityHeatmap.Cells.Should().BeEmpty();
        result.TopicHeatmap.Cells.Should().BeEmpty();
        result.RecentChats.Should().BeEmpty();
    }

    [Fact]
    public async Task MentionsByPlatform_AnswerCount_BrandMentionCount_AndRate()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerDepthQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDepthQuery(seed.TrackerId, 30), CancellationToken.None);

        // Each platform: 2 prompts × 2 scans × 1 answer = 4 answers. Brand
        // mentions on openai only (1 per answer) → openai rate 1.0, gemini rate 0.
        result!.MentionsByPlatform.Should().HaveCount(2);
        var openai = result.MentionsByPlatform.Single(p => p.PlatformCode == "openai");
        openai.AnswerCount.Should().Be(4);
        openai.BrandMentionCount.Should().Be(4);
        openai.BrandMentionRate.Should().BeApproximately(1.0, 1e-9);

        var gemini = result.MentionsByPlatform.Single(p => p.PlatformCode == "gemini");
        gemini.AnswerCount.Should().Be(4);
        gemini.BrandMentionCount.Should().Be(0);
        gemini.BrandMentionRate.Should().Be(0);

        // DisplayOrder respected — openai (1) before gemini (2).
        result.MentionsByPlatform[0].PlatformCode.Should().Be("openai");
    }

    [Fact]
    public async Task SentimentDistribution_AggregatesAcrossWindow()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerDepthQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDepthQuery(seed.TrackerId, 30), CancellationToken.None);

        // Brand mentions: 4 (openai × 2 scans × 2 prompts).
        // Sentiment: scan1 prompts → Positive (2 mentions), scan2 prompts → Negative (2).
        result!.SentimentDistribution.Should().HaveCount(2);
        var positive = result.SentimentDistribution.Single(s => s.Sentiment == "Positive");
        positive.Count.Should().Be(2);
        positive.Share.Should().BeApproximately(0.5, 1e-9);
        var negative = result.SentimentDistribution.Single(s => s.Sentiment == "Negative");
        negative.Count.Should().Be(2);
    }

    [Fact]
    public async Task ActivityHeatmap_RowsArePlatforms_ColumnsAreScans_CellsAreBrandMentionCounts()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerDepthQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDepthQuery(seed.TrackerId, 30), CancellationToken.None);

        result!.ActivityHeatmap.Rows.Should().Equal("ChatGPT", "Gemini");
        result.ActivityHeatmap.Columns.Should().HaveCount(2);

        // openai × any scan = 2 brand-mentioned answers (1 per prompt × 2 prompts).
        // gemini × any scan = 0 brand-mentioned answers.
        var openaiCells = result.ActivityHeatmap.Cells.Where(c => c.Row == "ChatGPT").ToList();
        openaiCells.Should().HaveCount(2);
        openaiCells.Should().OnlyContain(c => c.Value == 2);

        var geminiCells = result.ActivityHeatmap.Cells.Where(c => c.Row == "Gemini").ToList();
        geminiCells.Should().HaveCount(2);
        geminiCells.Should().OnlyContain(c => c.Value == 0);
    }

    [Fact]
    public async Task TopicHeatmap_RowsAreTopics_ColumnsArePlatforms_CellsAreAnswerCounts()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = new GetTrackerDepthQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDepthQuery(seed.TrackerId, 30), CancellationToken.None);

        // Topics with answers in window: Architecture (prompt1) + Interior Design (prompt1+prompt2).
        // Architecture × OpenAI = prompt1 runs on openai across 2 scans = 2 answers.
        // Interior Design × OpenAI = (prompt1 + prompt2) × 2 scans = 4 answers.
        result!.TopicHeatmap.Rows.Should().Contain(new[] { "Architecture", "Interior Design" });
        result.TopicHeatmap.Columns.Should().Equal("ChatGPT", "Gemini");

        int Cell(string row, string col) => result.TopicHeatmap.Cells
            .Where(c => c.Row == row && c.Column == col)
            .Select(c => c.Value)
            .FirstOrDefault();
        Cell("Architecture", "ChatGPT").Should().Be(2);
        Cell("Architecture", "Gemini").Should().Be(2);
        Cell("Interior Design", "ChatGPT").Should().Be(4);
        Cell("Interior Design", "Gemini").Should().Be(4);
    }

    [Fact]
    public async Task RecentChats_NewestFirst_TruncatedSnippet_AtMost10()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, answersPerScanPerPlatform: 4);
        var sut = new GetTrackerDepthQueryHandler(ctx);

        var result = await sut.Handle(new GetTrackerDepthQuery(seed.TrackerId, 30), CancellationToken.None);

        // 2 scans × 2 prompts × 2 platforms × 4 answers = 32 total, capped to 10.
        result!.RecentChats.Should().HaveCount(10);

        // Snippet truncated to 200 chars + ellipsis.
        result.RecentChats[0].AnswerSnippet.Length.Should().BeLessOrEqualTo(201);
        result.RecentChats[0].AnswerSnippet.Should().EndWith("…");

        // Ordered descending by CapturedAt.
        result.RecentChats
            .Zip(result.RecentChats.Skip(1), (a, b) => (a, b))
            .Should()
            .OnlyContain(pair => pair.a.CapturedAt >= pair.b.CapturedAt);

        // Mention/citation counts honored — 4 answers on openai per scan-prompt
        // got 1 brand mention each; gemini got 0.
        var openaiChat = result.RecentChats.First(c => c.PlatformCode == "openai");
        openaiChat.MentionCount.Should().BeGreaterOrEqualTo(1);
        openaiChat.BrandSentiment.Should().NotBeNull();
    }
}
