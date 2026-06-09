using AIVisibility.Application;
using AIVisibility.Application.Queries.Topics;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetScanTopicQueryHandler tests. Verifies per-topic metric pivot + the
/// runtime Topic×Platform sub-aggregation (Phase 4 v1 plan §Slice 3, D16).
/// </summary>
public class GetScanTopicQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid ScanRunId, Guid TopicId,
        Guid OpenAiPlatformId, Guid ClaudePlatformId,
        Guid TrustpilotSourceId);

    /// <summary>
    /// Builds a scan with one topic, two platforms (OpenAI + Claude), and
    /// answers spread across both so the Topic×Platform sub-aggregation
    /// has interesting structure to test. Topic A's prompt is mapped to
    /// the topic via PromptTopic.
    /// </summary>
    private static Seed BuildScan(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Lumina" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var topic = new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Sustainability", Confidence = 0.9 };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "Discovery", Name = "Discovery" };
        var openai = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "OpenAI" };
        var claude = new AIPlatform { Id = Guid.NewGuid(), Code = "claude", Name = "Claude" };
        var prompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, PromptText = "p", LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var promptTopic = new PromptTopic { PromptId = prompt.Id, TopicId = topic.Id };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);
        ctx.Topics.Add(topic);
        ctx.Lenses.Add(lens);
        ctx.AIPlatforms.Add(openai);
        ctx.AIPlatforms.Add(claude);
        ctx.Prompts.Add(prompt);
        ctx.PromptTopics.Add(promptTopic);

        // OpenAI: 2 prompt-runs → 2 answers (one brand-mentioned + recommended, one not).
        // Claude:  1 prompt-run  → 1 answer  (brand-mentioned, not recommended).
        var openAiRunA = NewRun(scan.Id, prompt.Id, openai.Id);
        var openAiRunB = NewRun(scan.Id, prompt.Id, openai.Id);
        var claudeRun = NewRun(scan.Id, prompt.Id, claude.Id);
        ctx.PromptRuns.AddRange(openAiRunA, openAiRunB, claudeRun);

        var ansOA = NewAnswer(openAiRunA.Id);
        var ansOB = NewAnswer(openAiRunB.Id);
        var ansC = NewAnswer(claudeRun.Id);
        ctx.AIAnswers.AddRange(ansOA, ansOB, ansC);

        ctx.AnswerSignals.Add(NewSignal(ansOA.Id, brandMentioned: true, brandRecommended: true));
        ctx.AnswerSignals.Add(NewSignal(ansOB.Id, brandMentioned: false, brandRecommended: false));
        ctx.AnswerSignals.Add(NewSignal(ansC.Id, brandMentioned: true, brandRecommended: false));

        // Mentions: brand mentioned twice (ansOA + ansC), competitor once (ansOA).
        ctx.Mentions.Add(NewMention(ansOA.Id, MentionEntityType.Brand));
        ctx.Mentions.Add(NewMention(ansOA.Id, MentionEntityType.Competitor));
        ctx.Mentions.Add(NewMention(ansC.Id, MentionEntityType.Brand));

        // Trustpilot cited 3 times (ansOA × 2 + ansC × 1) → top cited source.
        // Wikipedia cited once on ansOB.
        var trustpilot = new Source { Id = Guid.NewGuid(), SourceName = "Trustpilot", CreatedAt = DateTime.UtcNow };
        var wikipedia = new Source { Id = Guid.NewGuid(), SourceName = "Wikipedia", CreatedAt = DateTime.UtcNow };
        ctx.Sources.Add(trustpilot);
        ctx.Sources.Add(wikipedia);
        ctx.Citations.Add(NewCitation(ansOA.Id, trustpilot.Id));
        ctx.Citations.Add(NewCitation(ansOA.Id, trustpilot.Id));
        ctx.Citations.Add(NewCitation(ansC.Id, trustpilot.Id));
        ctx.Citations.Add(NewCitation(ansOB.Id, wikipedia.Id));

        // Pre-computed Topic-scope metrics (in the real pipeline these are
        // produced by MetricAggregator; here we seed them directly).
        AddMetric(ctx, scan.Id, topic.Id, MetricNames.BrandMentionRate, 2.0 / 3.0);
        AddMetric(ctx, scan.Id, topic.Id, MetricNames.BrandRecommendationRate, 1.0 / 3.0);
        AddMetric(ctx, scan.Id, topic.Id, MetricNames.CitationCount, 4);
        AddMetric(ctx, scan.Id, topic.Id, MetricNames.OwnedCitationCount, 0);
        AddMetric(ctx, scan.Id, topic.Id, MetricNames.BrandSentimentDistribution, 2, "{\"value\":\"Positive\"}");

        ctx.SaveChanges();
        return new Seed(scan.Id, topic.Id, openai.Id, claude.Id, trustpilot.Id);
    }

    [Fact]
    public async Task ReturnsNull_WhenScanDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetScanTopicQueryHandler(ctx);
        var result = await sut.Handle(new GetScanTopicQuery(Guid.NewGuid(), Guid.NewGuid()), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNull_WhenTopicDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = BuildScan(ctx);
        var sut = new GetScanTopicQueryHandler(ctx);
        var result = await sut.Handle(new GetScanTopicQuery(seed.ScanRunId, Guid.NewGuid()), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task PivotsTopicMetricsIntoDetail()
    {
        using var ctx = NewContext();
        var seed = BuildScan(ctx);
        var sut = new GetScanTopicQueryHandler(ctx);

        var result = await sut.Handle(new GetScanTopicQuery(seed.ScanRunId, seed.TopicId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.TopicName.Should().Be("Sustainability");
        result.Metrics.BrandMentionRate.Should().BeApproximately(2.0 / 3.0, 1e-9);
        result.Metrics.CitationCount.Should().Be(4);
        result.Metrics.BrandSentimentDistribution.Should().ContainKey("Positive");
    }

    [Fact]
    public async Task PerPlatformBreakdown_SlicesMetricsByPlatformWithinTopic()
    {
        using var ctx = NewContext();
        var seed = BuildScan(ctx);
        var sut = new GetScanTopicQueryHandler(ctx);

        var result = await sut.Handle(new GetScanTopicQuery(seed.ScanRunId, seed.TopicId), CancellationToken.None);

        result!.ByPlatform.Should().HaveCount(2);

        var openai = result.ByPlatform.Single(p => p.PlatformCode == "openai");
        openai.AnswerCount.Should().Be(2);
        openai.BrandMentionRate.Should().BeApproximately(0.5, 1e-9);       // 1 of 2 answers
        openai.BrandRecommendationRate.Should().BeApproximately(0.5, 1e-9); // 1 of 2 answers recommended
        // SoV within OpenAI subset: 1 brand mention vs 1 competitor mention = 1/2.
        openai.BrandShareOfVoice.Should().BeApproximately(0.5, 1e-9);
        openai.CitationCount.Should().Be(3); // ansOA × 2 trustpilot + ansOB × 1 wikipedia

        var claude = result.ByPlatform.Single(p => p.PlatformCode == "claude");
        claude.AnswerCount.Should().Be(1);
        claude.BrandMentionRate.Should().BeApproximately(1.0, 1e-9);
        // No competitor mentions on Claude → SoV = 1 / (1+0) = 1.
        claude.BrandShareOfVoice.Should().BeApproximately(1.0, 1e-9);
        claude.CitationCount.Should().Be(1);
    }

    [Fact]
    public async Task TopCitedSources_AreOrderedByCountWithinTopic()
    {
        using var ctx = NewContext();
        var seed = BuildScan(ctx);
        var sut = new GetScanTopicQueryHandler(ctx);

        var result = await sut.Handle(new GetScanTopicQuery(seed.ScanRunId, seed.TopicId), CancellationToken.None);

        result!.TopCitedSources.Should().HaveCount(2);
        result.TopCitedSources[0].SourceName.Should().Be("Trustpilot");
        result.TopCitedSources[0].CitationCount.Should().Be(3);
        result.TopCitedSources[1].SourceName.Should().Be("Wikipedia");
        result.TopCitedSources[1].CitationCount.Should().Be(1);
    }

    [Fact]
    public async Task ReturnsEmptyBreakdowns_WhenTopicHasNoMatchedPromptRuns()
    {
        // Topic exists but no prompt is mapped to it in this scan (or all
        // prompt-runs are in a different scan). Detail still returns —
        // metrics may also be empty — but breakdowns + sources are empty.
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var orphanTopic = new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Orphan", Confidence = 0.5 };
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker); ctx.ScanRuns.Add(scan); ctx.Topics.Add(orphanTopic);
        ctx.SaveChanges();

        var sut = new GetScanTopicQueryHandler(ctx);
        var result = await sut.Handle(new GetScanTopicQuery(scan.Id, orphanTopic.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.ByPlatform.Should().BeEmpty();
        result.TopCitedSources.Should().BeEmpty();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private static PromptRun NewRun(Guid scanId, Guid promptId, Guid platformId) => new()
    {
        Id = Guid.NewGuid(), ScanRunId = scanId, PromptId = promptId, AIPlatformId = platformId,
        Status = PromptRunStatus.Completed, StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow,
    };

    private static AIAnswer NewAnswer(Guid promptRunId) => new()
    {
        Id = Guid.NewGuid(), PromptRunId = promptRunId, AnswerText = "a", CreatedAt = DateTime.UtcNow,
    };

    private static AnswerSignal NewSignal(Guid answerId, bool brandMentioned, bool brandRecommended) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId,
        BrandMentioned = brandMentioned, BrandRecommended = brandRecommended,
        CreatedAt = DateTime.UtcNow,
    };

    private static Mention NewMention(Guid answerId, MentionEntityType type) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId,
        EntityType = type, EntityId = Guid.NewGuid(),
        NormalizedName = "x", EvidenceSnippet = "e",
        CreatedAt = DateTime.UtcNow,
    };

    private static Citation NewCitation(Guid answerId, Guid sourceId) => new()
    {
        Id = Guid.NewGuid(), AIAnswerId = answerId, SourceId = sourceId,
        CitationType = CitationType.ExplicitUrl, CreatedAt = DateTime.UtcNow,
    };

    private static void AddMetric(AppDbContext ctx, Guid scanId, Guid scopeId, string name, double value, string? metadata = null)
    {
        ctx.ScanMetrics.Add(new ScanMetric
        {
            Id = Guid.NewGuid(), ScanRunId = scanId,
            Scope = ScanMetricScope.Topic, ScopeId = scopeId,
            MetricName = name, MetricValue = value,
            MetadataJson = metadata, CreatedAt = DateTime.UtcNow,
        });
    }
}
