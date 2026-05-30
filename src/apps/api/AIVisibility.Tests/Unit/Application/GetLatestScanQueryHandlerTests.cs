using AIVisibility.Application.Queries.Scans;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetLatestScanQueryHandler tests. The handler powers the
/// post-onboarding ScanProgressScreen polling — every 2s it returns
/// per-platform progress + live counters, so the UI can update without
/// refetching the heavier scan-results endpoint.
/// </summary>
public class GetLatestScanQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetLatestScanQueryHandler NewHandler(AppDbContext ctx) => new(ctx);

    private sealed record Fixture(Guid TrackerId, Guid ScanRunId, Guid OpenAIId, Guid GeminiId);

    private static Fixture Seed(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Acme",
            WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Brand = brand,
            Name = "Acme tracker",
            Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow,
        };
        var openai = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };
        var gemini = new AIPlatform { Id = Guid.NewGuid(), Code = "gemini", Name = "Gemini", DisplayOrder = 2 };
        var run = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            TriggerType = ScanTriggerType.Manual,
            Status = ScanRunStatus.Running,
            PromptCount = 3,
            PlatformCount = 2,
            ScanCheckCount = 6,
            StartedAt = DateTime.UtcNow,
        };

        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.AIPlatforms.AddRange(openai, gemini);
        ctx.ScanRuns.Add(run);

        return new Fixture(tracker.Id, run.Id, openai.Id, gemini.Id);
    }

    private static PromptRun PR(Guid scanRunId, Guid platformId, PromptRunStatus status) =>
        new()
        {
            Id = Guid.NewGuid(),
            ScanRunId = scanRunId,
            PromptId = Guid.NewGuid(),
            AIPlatformId = platformId,
            Status = status,
        };

    [Fact]
    public async Task ReturnsNull_WhenTrackerHasNoScans()
    {
        using var ctx = NewContext();
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetLatestScanQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsBrandName_FromTheTrackersAssociatedBrand()
    {
        using var ctx = NewContext();
        var f = Seed(ctx);
        // Seed already created brand "Acme" tied to the tracker.
        await ctx.SaveChangesAsync();
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetLatestScanQuery(f.TrackerId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.BrandName.Should().Be("Acme");
    }

    [Fact]
    public async Task DerivesPerPlatformStatus_FromPromptRunCounts()
    {
        using var ctx = NewContext();
        var f = Seed(ctx);
        // ChatGPT: 3 completed / 0 failed of 3  → Done
        // Gemini : 1 completed / 0 failed, 2 pending of 3 → Running
        ctx.PromptRuns.AddRange(
            PR(f.ScanRunId, f.OpenAIId, PromptRunStatus.Completed),
            PR(f.ScanRunId, f.OpenAIId, PromptRunStatus.Completed),
            PR(f.ScanRunId, f.OpenAIId, PromptRunStatus.Completed),
            PR(f.ScanRunId, f.GeminiId, PromptRunStatus.Completed),
            PR(f.ScanRunId, f.GeminiId, PromptRunStatus.Pending),
            PR(f.ScanRunId, f.GeminiId, PromptRunStatus.Pending));
        await ctx.SaveChangesAsync();

        var sut = NewHandler(ctx);
        var result = await sut.Handle(new GetLatestScanQuery(f.TrackerId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.CompletedCount.Should().Be(4);
        result.FailedCount.Should().Be(0);
        result.Platforms.Should().HaveCount(2);
        var chatgpt = result.Platforms.Single(p => p.Code == "openai");
        chatgpt.Completed.Should().Be(3);
        chatgpt.Failed.Should().Be(0);
        chatgpt.Total.Should().Be(3);
        chatgpt.Status.Should().Be("Done");
        var gemini = result.Platforms.Single(p => p.Code == "gemini");
        gemini.Completed.Should().Be(1);
        gemini.Total.Should().Be(3);
        gemini.Status.Should().Be("Running");
    }

    [Fact]
    public async Task DerivesPlatformStatus_FailedWhenEveryRunOnPlatformFailed()
    {
        using var ctx = NewContext();
        var f = Seed(ctx);
        ctx.PromptRuns.AddRange(
            PR(f.ScanRunId, f.OpenAIId, PromptRunStatus.Failed),
            PR(f.ScanRunId, f.OpenAIId, PromptRunStatus.Failed),
            PR(f.ScanRunId, f.OpenAIId, PromptRunStatus.Failed));
        await ctx.SaveChangesAsync();

        var sut = NewHandler(ctx);
        var result = await sut.Handle(new GetLatestScanQuery(f.TrackerId), CancellationToken.None);

        var openai = result!.Platforms.Single(p => p.Code == "openai");
        openai.Failed.Should().Be(3);
        openai.Status.Should().Be("Failed");
    }

    [Fact]
    public async Task AggregatesLiveCounters_AcrossThisScansAnswers()
    {
        using var ctx = NewContext();
        var f = Seed(ctx);

        var pr1 = PR(f.ScanRunId, f.OpenAIId, PromptRunStatus.Completed);
        var pr2 = PR(f.ScanRunId, f.GeminiId, PromptRunStatus.Completed);
        var pr3 = PR(f.ScanRunId, f.OpenAIId, PromptRunStatus.Pending);
        ctx.PromptRuns.AddRange(pr1, pr2, pr3);

        // PromptRun belonging to a DIFFERENT scan — must NOT count.
        var otherScan = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = f.TrackerId,
            TriggerType = ScanTriggerType.Manual,
            Status = ScanRunStatus.Completed,
            PromptCount = 1, PlatformCount = 1, ScanCheckCount = 1,
            StartedAt = DateTime.UtcNow.AddMinutes(-10),
            CompletedAt = DateTime.UtcNow.AddMinutes(-5),
        };
        ctx.ScanRuns.Add(otherScan);
        var oldPr = PR(otherScan.Id, f.OpenAIId, PromptRunStatus.Completed);
        ctx.PromptRuns.Add(oldPr);

        // Answers for our 3 prompt-runs + the old scan's.
        var ans1 = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = pr1.Id, AnswerText = "", CreatedAt = DateTime.UtcNow };
        var ans2 = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = pr2.Id, AnswerText = "", CreatedAt = DateTime.UtcNow };
        var oldAns = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = oldPr.Id, AnswerText = "", CreatedAt = DateTime.UtcNow };
        ctx.AIAnswers.AddRange(ans1, ans2, oldAns);

        // Mentions on this scan: 3 positive (1 recommended), 1 negative, 1 neutral.
        ctx.Mentions.AddRange(
            new Mention
            {
                Id = Guid.NewGuid(), AIAnswerId = ans1.Id, EntityType = MentionEntityType.Brand,
                EntityId = Guid.NewGuid(), NormalizedName = "Acme",
                Sentiment = Sentiment.Positive, IsRecommended = true, CreatedAt = DateTime.UtcNow,
            },
            new Mention
            {
                Id = Guid.NewGuid(), AIAnswerId = ans1.Id, EntityType = MentionEntityType.Brand,
                EntityId = Guid.NewGuid(), NormalizedName = "Acme",
                Sentiment = Sentiment.Positive, IsRecommended = false, CreatedAt = DateTime.UtcNow,
            },
            new Mention
            {
                Id = Guid.NewGuid(), AIAnswerId = ans2.Id, EntityType = MentionEntityType.Brand,
                EntityId = Guid.NewGuid(), NormalizedName = "Acme",
                Sentiment = Sentiment.Positive, IsRecommended = false, CreatedAt = DateTime.UtcNow,
            },
            new Mention
            {
                Id = Guid.NewGuid(), AIAnswerId = ans2.Id, EntityType = MentionEntityType.Brand,
                EntityId = Guid.NewGuid(), NormalizedName = "Acme",
                Sentiment = Sentiment.Negative, IsRecommended = false, CreatedAt = DateTime.UtcNow,
            },
            new Mention
            {
                Id = Guid.NewGuid(), AIAnswerId = ans2.Id, EntityType = MentionEntityType.Brand,
                EntityId = Guid.NewGuid(), NormalizedName = "Acme",
                Sentiment = Sentiment.Neutral, IsRecommended = false, CreatedAt = DateTime.UtcNow,
            });

        // Mention attached to the older scan's answer — must NOT count.
        ctx.Mentions.Add(new Mention
        {
            Id = Guid.NewGuid(), AIAnswerId = oldAns.Id, EntityType = MentionEntityType.Brand,
            EntityId = Guid.NewGuid(), NormalizedName = "Acme",
            Sentiment = Sentiment.Positive, IsRecommended = true, CreatedAt = DateTime.UtcNow,
        });

        // Citations: 2 on this scan, 1 on the old scan.
        ctx.Citations.AddRange(
            new Citation { Id = Guid.NewGuid(), AIAnswerId = ans1.Id, SourceUrlId = Guid.NewGuid() },
            new Citation { Id = Guid.NewGuid(), AIAnswerId = ans2.Id, SourceUrlId = Guid.NewGuid() },
            new Citation { Id = Guid.NewGuid(), AIAnswerId = oldAns.Id, SourceUrlId = Guid.NewGuid() });

        await ctx.SaveChangesAsync();

        // The handler should pick the newest scan (StartedAt) — that's the one
        // Seed() created, with ScanRunId == f.ScanRunId, not the older one.
        var sut = NewHandler(ctx);
        var result = await sut.Handle(new GetLatestScanQuery(f.TrackerId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.ScanRunId.Should().Be(f.ScanRunId);
        result.LiveCounters.Mentions.Should().Be(5);
        result.LiveCounters.Citations.Should().Be(2);
        result.LiveCounters.Recommended.Should().Be(1);
        result.LiveCounters.Sentiment.Positive.Should().Be(3);
        result.LiveCounters.Sentiment.Neutral.Should().Be(1);
        result.LiveCounters.Sentiment.Negative.Should().Be(1);
        result.LiveCounters.Sentiment.Mixed.Should().Be(0);
        result.LiveCounters.Sentiment.Unknown.Should().Be(0);
    }
}
