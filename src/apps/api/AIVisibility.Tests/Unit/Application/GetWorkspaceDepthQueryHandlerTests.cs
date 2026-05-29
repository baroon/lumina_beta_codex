using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspaceDepthQueryHandler tests (Phase 4 v3 Slice C). Multi-brand
/// workspace depth aggregation: per-platform brand mention rate summed
/// across tracked brands, sentiment distribution across workspace,
/// activity heatmap across all trackers, topic heatmap with cross-brand
/// name grouping, recent chats with tracker + brand context.
/// </summary>
public class GetWorkspaceDepthQueryHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = Guid.Empty;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetWorkspaceDepthQueryHandler NewHandler(AppDbContext ctx) =>
        new(ctx, new StubWorkspaceContext());

    private sealed record Seed(
        Guid AcmeId, Guid AcmeTrackerId, Guid AcmeAnswerOpenAIId, Guid AcmeAnswerGeminiId,
        Guid BetaId, Guid BetaTrackerId, Guid BetaAnswerOpenAIId,
        Guid OpenAIId, Guid GeminiId);

    /// <summary>
    /// Fixture: Acme + Beta tracked brands, each with one tracker. Acme
    /// runs on 2 platforms (OpenAI, Gemini), Beta on 1 (OpenAI). One scan
    /// per tracker. Acme prompts both have topic "Architecture"; Beta's
    /// prompt has a topic with the SAME name "Architecture" but a
    /// different Topic.Id (cross-brand name equivalence test).
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
        var openai = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };
        var gemini = new AIPlatform { Id = Guid.NewGuid(), Code = "gemini", Name = "Gemini", DisplayOrder = 2 };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "x", Name = "x" };
        // Same NAME, different Id — verifies cross-brand name grouping.
        var acmeArchitectureTopic = new Topic { Id = Guid.NewGuid(), BrandId = acme.Id, Name = "Architecture", Confidence = 0.9 };
        var betaArchitectureTopic = new Topic { Id = Guid.NewGuid(), BrandId = beta.Id, Name = "Architecture", Confidence = 0.9 };

        ctx.Brands.AddRange(acme, beta);
        ctx.TrackerConfigurations.AddRange(acmeTracker, betaTracker);
        ctx.AIPlatforms.AddRange(openai, gemini);
        ctx.Lenses.Add(lens);
        ctx.Topics.AddRange(acmeArchitectureTopic, betaArchitectureTopic);

        var now = DateTime.UtcNow;
        var acmePrompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, PromptText = "Best architecture firms in NYC?", LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = now, UpdatedAt = now };
        var betaPrompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = betaTracker.Id, PromptText = "Top firms for healthcare architecture?", LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = now, UpdatedAt = now };
        ctx.Prompts.AddRange(acmePrompt, betaPrompt);
        ctx.PromptTopics.Add(new PromptTopic { Id = Guid.NewGuid(), PromptId = acmePrompt.Id, TopicId = acmeArchitectureTopic.Id });
        ctx.PromptTopics.Add(new PromptTopic { Id = Guid.NewGuid(), PromptId = betaPrompt.Id, TopicId = betaArchitectureTopic.Id });

        var acmeScan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = acmeTracker.Id, TrackerConfiguration = acmeTracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = now.AddDays(-2), CompletedAt = now.AddDays(-2) };
        var betaScan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = betaTracker.Id, TrackerConfiguration = betaTracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = now.AddDays(-1), CompletedAt = now.AddDays(-1) };
        ctx.ScanRuns.AddRange(acmeScan, betaScan);

        // Acme tracker: 2 platforms × 1 prompt × 1 answer each.
        var acmeOpenAIRun = new PromptRun { Id = Guid.NewGuid(), ScanRunId = acmeScan.Id, PromptId = acmePrompt.Id, AIPlatformId = openai.Id, Status = PromptRunStatus.Completed, StartedAt = acmeScan.StartedAt };
        var acmeGeminiRun = new PromptRun { Id = Guid.NewGuid(), ScanRunId = acmeScan.Id, PromptId = acmePrompt.Id, AIPlatformId = gemini.Id, Status = PromptRunStatus.Completed, StartedAt = acmeScan.StartedAt };
        var betaOpenAIRun = new PromptRun { Id = Guid.NewGuid(), ScanRunId = betaScan.Id, PromptId = betaPrompt.Id, AIPlatformId = openai.Id, Status = PromptRunStatus.Completed, StartedAt = betaScan.StartedAt };
        ctx.PromptRuns.AddRange(acmeOpenAIRun, acmeGeminiRun, betaOpenAIRun);

        var acmeAnswerOpenAI = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = acmeOpenAIRun.Id, AnswerText = "Acme is the best, also " + new string('x', 220), CreatedAt = acmeScan.StartedAt.AddSeconds(1) };
        var acmeAnswerGemini = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = acmeGeminiRun.Id, AnswerText = "Gemini's answer for Acme", CreatedAt = acmeScan.StartedAt.AddSeconds(2) };
        var betaAnswerOpenAI = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = betaOpenAIRun.Id, AnswerText = "Beta is the best", CreatedAt = betaScan.StartedAt.AddSeconds(1) };
        ctx.AIAnswers.AddRange(acmeAnswerOpenAI, acmeAnswerGemini, betaAnswerOpenAI);

        ctx.AnswerSignals.Add(new AnswerSignal { Id = Guid.NewGuid(), AIAnswerId = acmeAnswerOpenAI.Id, BrandSentiment = Sentiment.Positive, CreatedAt = now });
        ctx.AnswerSignals.Add(new AnswerSignal { Id = Guid.NewGuid(), AIAnswerId = acmeAnswerGemini.Id, BrandSentiment = Sentiment.Neutral, CreatedAt = now });
        ctx.AnswerSignals.Add(new AnswerSignal { Id = Guid.NewGuid(), AIAnswerId = betaAnswerOpenAI.Id, BrandSentiment = Sentiment.Positive, CreatedAt = now });

        // Brand mentions: Acme on openai (Positive), Acme on gemini (Negative),
        // Beta on openai (Positive). Total brand mentions = 3.
        ctx.Mentions.Add(NewMention(acmeAnswerOpenAI.Id, acme.Id, Sentiment.Positive));
        ctx.Mentions.Add(NewMention(acmeAnswerGemini.Id, acme.Id, Sentiment.Negative));
        ctx.Mentions.Add(NewMention(betaAnswerOpenAI.Id, beta.Id, Sentiment.Positive));

        ctx.SaveChanges();
        return new Seed(
            acme.Id, acmeTracker.Id, acmeAnswerOpenAI.Id, acmeAnswerGemini.Id,
            beta.Id, betaTracker.Id, betaAnswerOpenAI.Id,
            openai.Id, gemini.Id);
    }

    private static Mention NewMention(Guid answerId, Guid brandId, Sentiment sentiment) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId,
        EntityType = MentionEntityType.Brand, EntityId = brandId,
        NormalizedName = "n", EvidenceSnippet = "e",
        IsRecommended = false, Sentiment = sentiment,
        CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task ReturnsEmpty_WhenWorkspaceHasNoBrands()
    {
        using var ctx = NewContext();
        var sut = NewHandler(ctx);
        var result = await sut.Handle(new GetWorkspaceDepthQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);
        result.Should().NotBeNull();
        result.MentionsByPlatform.Should().BeEmpty();
        result.RecentChats.Should().BeEmpty();
    }

    [Fact]
    public async Task MentionsByPlatform_AnswerCount_BrandMentionsAggregateAcrossBrands()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceDepthQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // OpenAI: 2 answers (Acme + Beta), 2 brand mentions → rate 1.0.
        // Gemini: 1 answer (Acme), 1 brand mention → rate 1.0.
        var openai = result.MentionsByPlatform.Single(p => p.PlatformCode == "openai");
        openai.AnswerCount.Should().Be(2);
        openai.BrandMentionCount.Should().Be(2);
        openai.BrandMentionRate.Should().Be(1.0);

        var gemini = result.MentionsByPlatform.Single(p => p.PlatformCode == "gemini");
        gemini.AnswerCount.Should().Be(1);
        gemini.BrandMentionCount.Should().Be(1);
        gemini.BrandMentionRate.Should().Be(1.0);

        // DisplayOrder respected.
        result.MentionsByPlatform[0].PlatformCode.Should().Be("openai");
    }

    [Fact]
    public async Task SentimentDistribution_AcrossAllTrackedBrandMentions()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceDepthQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // 3 brand mentions: Positive x2, Negative x1.
        var positive = result.SentimentDistribution.Single(s => s.Sentiment == "Positive");
        positive.Count.Should().Be(2);
        positive.Share.Should().BeApproximately(2.0 / 3.0, 1e-9);
        var negative = result.SentimentDistribution.Single(s => s.Sentiment == "Negative");
        negative.Count.Should().Be(1);
    }

    [Fact]
    public async Task TopicHeatmap_GroupsByTopicName_AcrossBrands()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceDepthQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // Acme + Beta both have a topic NAMED "Architecture" but with
        // different Ids — the workspace heatmap groups by name, so there
        // should be exactly one row.
        result.TopicHeatmap.Rows.Should().Equal("Architecture");
        // OpenAI cell: Acme's openai run (1 answer) + Beta's openai run (1) = 2.
        // Gemini cell: Acme's gemini run (1) = 1.
        var openAICell = result.TopicHeatmap.Cells.Single(c => c.Row == "Architecture" && c.Column == "ChatGPT");
        openAICell.AnswerCount.Should().Be(2);
        var geminiCell = result.TopicHeatmap.Cells.Single(c => c.Row == "Architecture" && c.Column == "Gemini");
        geminiCell.AnswerCount.Should().Be(1);
        // Fixture seeds no Citations; citation count is 0 on every cell.
        result.TopicHeatmap.Cells.Should().OnlyContain(c => c.CitationCount == 0);
    }

    [Fact]
    public async Task TopicHeatmap_CitationCount_SumsAcrossAnswersInTheCell()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        // Add 3 citations to Acme's OpenAI answer + 1 to Acme's Gemini
        // answer + 2 to Beta's OpenAI answer. Architecture × ChatGPT
        // citation total = 3 (Acme) + 2 (Beta) = 5; × Gemini = 1.
        var source = new Source
        {
            Id = Guid.NewGuid(), SourceName = "X", Domain = "x.com",
            NormalizedDomain = "x.com", CreatedAt = DateTime.UtcNow,
        };
        ctx.Sources.Add(source);
        for (var i = 0; i < 3; i++)
            ctx.Citations.Add(NewCitation(seed.AcmeAnswerOpenAIId, source.Id));
        ctx.Citations.Add(NewCitation(seed.AcmeAnswerGeminiId, source.Id));
        for (var i = 0; i < 2; i++)
            ctx.Citations.Add(NewCitation(seed.BetaAnswerOpenAIId, source.Id));
        ctx.SaveChanges();

        var sut = NewHandler(ctx);
        var result = await sut.Handle(new GetWorkspaceDepthQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        var openAICell = result.TopicHeatmap.Cells.Single(c => c.Row == "Architecture" && c.Column == "ChatGPT");
        openAICell.CitationCount.Should().Be(5);
        var geminiCell = result.TopicHeatmap.Cells.Single(c => c.Row == "Architecture" && c.Column == "Gemini");
        geminiCell.CitationCount.Should().Be(1);

        // Answer counts stay where they were — toggle should not reshuffle rows.
        openAICell.AnswerCount.Should().Be(2);
        geminiCell.AnswerCount.Should().Be(1);
    }

    private static Citation NewCitation(Guid answerId, Guid sourceId) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId, SourceId = sourceId,
        CitationType = CitationType.ExplicitUrl, CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task RecentChats_NewestFirstAcrossWorkspace_WithBrandContext()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceDepthQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // 3 answers total — all fit in the cap of 10.
        result.RecentChats.Should().HaveCount(3);

        // Each card carries the owning brand name (tracker identity is
        // intentionally not surfaced — see WorkspaceRecentChatDto).
        result.RecentChats.Where(c => c.BrandName == "Acme").Should().HaveCount(2);
        result.RecentChats.Where(c => c.BrandName == "Beta").Should().HaveCount(1);

        // Ordered descending by CapturedAt.
        result.RecentChats
            .Zip(result.RecentChats.Skip(1), (a, b) => (a, b))
            .Should().OnlyContain(pair => pair.a.CapturedAt >= pair.b.CapturedAt);

        // Long answer snippet truncated.
        var long_ = result.RecentChats.Single(c => c.AnswerId == seed.AcmeAnswerOpenAIId);
        long_.AnswerSnippet.Should().EndWith("…");
        long_.AnswerSnippet.Length.Should().BeLessOrEqualTo(201);
    }
}
