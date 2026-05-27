using AIVisibility.Application;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

/// <summary>
/// Pure aggregator unit tests. Seeds AnswerSignal + Mention + Citation rows
/// directly so the math is exercised without going through the LLM extractor.
/// Each scope is covered separately to keep failure messages localised.
/// </summary>
public class MetricAggregatorTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static MetricAggregator NewAggregator(AppDbContext ctx) =>
        new(ctx, new Mock<ILogger<MetricAggregator>>().Object);

    /// <summary>
    /// Builder for a single answer row + its signal/mentions/citations.
    /// Caller picks the platform/lens/topics so multi-scope tests can vary
    /// dimensions independently.
    /// </summary>
    private sealed record AnswerSetup(
        Guid AIAnswerId,
        Guid PlatformId,
        Guid LensId,
        Guid[] TopicIds,
        bool BrandMentioned,
        bool BrandRecommended,
        int? BrandRank,
        IEnumerable<(MentionEntityType Type, Guid EntityId, bool Recommended)> Mentions,
        IEnumerable<SourceClassification> Citations);

    private static Guid SeedScanAndAnswers(AppDbContext ctx, params AnswerSetup[] answers)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B", WebsiteUrl = "https://b.io" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T",
            Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);

        var platformCache = new Dictionary<Guid, AIPlatform>();
        var promptCache = new Dictionary<(Guid Lens, string Topics), Prompt>();

        foreach (var a in answers)
        {
            if (!platformCache.ContainsKey(a.PlatformId))
            {
                var p = new AIPlatform { Id = a.PlatformId, Code = $"p{a.PlatformId:N}", Name = "P" };
                ctx.AIPlatforms.Add(p);
                platformCache[a.PlatformId] = p;
            }

            // Reuse Prompt rows when lens + topics combo matches, so PromptTopic
            // rows don't double-count.
            var key = (a.LensId, string.Join(",", a.TopicIds.OrderBy(t => t)));
            if (!promptCache.TryGetValue(key, out var prompt))
            {
                prompt = new Prompt
                {
                    Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id,
                    PromptText = "p", LensId = a.LensId,
                    Status = PromptStatus.Active, Source = PromptSource.Generated,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
                };
                ctx.Prompts.Add(prompt);
                foreach (var topicId in a.TopicIds)
                {
                    ctx.PromptTopics.Add(new PromptTopic
                    {
                        Id = Guid.NewGuid(), PromptId = prompt.Id, TopicId = topicId,
                    });
                }
                promptCache[key] = prompt;
            }

            var promptRun = new PromptRun
            {
                Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id,
                AIPlatformId = a.PlatformId, Status = PromptRunStatus.Completed,
                StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow,
            };
            ctx.PromptRuns.Add(promptRun);

            var answer = new AIAnswer
            {
                Id = a.AIAnswerId, PromptRunId = promptRun.Id,
                AnswerText = "x", CreatedAt = DateTime.UtcNow,
            };
            ctx.AIAnswers.Add(answer);

            ctx.AnswerSignals.Add(new AnswerSignal
            {
                Id = Guid.NewGuid(),
                AIAnswerId = answer.Id,
                BrandMentioned = a.BrandMentioned,
                BrandRecommended = a.BrandRecommended,
                BrandRank = a.BrandRank,
                CreatedAt = DateTime.UtcNow,
            });

            foreach (var m in a.Mentions)
            {
                ctx.Mentions.Add(new Mention
                {
                    Id = Guid.NewGuid(), AIAnswerId = answer.Id,
                    EntityType = m.Type, EntityId = m.EntityId,
                    NormalizedName = "n", IsRecommended = m.Recommended,
                    EvidenceSnippet = "e", CreatedAt = DateTime.UtcNow,
                });
            }

            foreach (var c in a.Citations)
            {
                ctx.Citations.Add(new Citation
                {
                    Id = Guid.NewGuid(), AIAnswerId = answer.Id,
                    SourceName = "s", NormalizedSourceName = "s",
                    Classification = c, CitationType = CitationType.ExplicitUrl,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        ctx.SaveChanges();
        return scan.Id;
    }

    [Fact]
    public async Task EmptyScan_ReturnsZeroRows()
    {
        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx);   // no answers
        var sut = NewAggregator(ctx);

        var rows = await sut.ComputeAsync(scanRunId, CancellationToken.None);

        rows.Should().BeEmpty();
    }

    [Fact]
    public async Task Overall_AllTenMetrics_HaveExpectedValues()
    {
        var platformA = Guid.NewGuid();
        var lensA = Guid.NewGuid();
        var competitorA = Guid.NewGuid();
        var competitorB = Guid.NewGuid();
        var productA = Guid.NewGuid();

        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            // Answer 0: brand mentioned + recommended, rank=1, 1 owned + 1 competitor citation, 1 competitor mention.
            new AnswerSetup(Guid.NewGuid(), platformA, lensA, Array.Empty<Guid>(),
                BrandMentioned: true, BrandRecommended: true, BrandRank: 1,
                Mentions: new[] { (MentionEntityType.Competitor, competitorA, true) },
                Citations: new[] { SourceClassification.Owned, SourceClassification.Competitor }),
            // Answer 1: brand mentioned, not recommended, rank=3, 1 third-party citation, 1 product mention.
            new AnswerSetup(Guid.NewGuid(), platformA, lensA, Array.Empty<Guid>(),
                BrandMentioned: true, BrandRecommended: false, BrandRank: 3,
                Mentions: new[] { (MentionEntityType.Product, productA, false) },
                Citations: new[] { SourceClassification.ThirdParty }),
            // Answer 2: brand absent, 1 competitor mention (other competitor).
            new AnswerSetup(Guid.NewGuid(), platformA, lensA, Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: new[] { (MentionEntityType.Competitor, competitorB, false) },
                Citations: Array.Empty<SourceClassification>()));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);
        var overall = rows.Where(r => r.Scope == ScanMetricScope.Overall).ToList();

        overall.Single(r => r.MetricName == MetricNames.BrandMentionRate)
            .MetricValue.Should().BeApproximately(2.0 / 3.0, 1e-9);
        overall.Single(r => r.MetricName == MetricNames.BrandRecommendationRate)
            .MetricValue.Should().BeApproximately(1.0 / 3.0, 1e-9);
        // Average across the 2 signals that had a rank.
        overall.Single(r => r.MetricName == MetricNames.AverageBrandRank)
            .MetricValue.Should().BeApproximately(2.0, 1e-9);

        overall.Single(r => r.MetricName == MetricNames.CompetitorMentionCount)
            .MetricValue.Should().Be(2);
        overall.Single(r => r.MetricName == MetricNames.ProductMentionCount)
            .MetricValue.Should().Be(1);

        overall.Single(r => r.MetricName == MetricNames.CitationCount)
            .MetricValue.Should().Be(3);
        overall.Single(r => r.MetricName == MetricNames.OwnedCitationCount)
            .MetricValue.Should().Be(1);
        overall.Single(r => r.MetricName == MetricNames.CompetitorCitationCount)
            .MetricValue.Should().Be(1);
        overall.Single(r => r.MetricName == MetricNames.ThirdPartyCitationCount)
            .MetricValue.Should().Be(1);

        // CHECK constraint contract: Overall rows MUST have null scope_id.
        overall.Should().AllSatisfy(r => r.ScopeId.Should().BeNull());
    }

    [Fact]
    public async Task AverageBrandRank_Omitted_WhenNoSignalHasRank()
    {
        // D11 + plan note: AverageBrandRank only emits when at least one signal
        // contributed a non-null rank. Otherwise the metric is absent (not 0).
        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceClassification>()));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        rows.Should().NotContain(r => r.MetricName == MetricNames.AverageBrandRank);
    }

    [Fact]
    public async Task Platform_EmitsOneRowSet_PerPlatform()
    {
        var platformA = Guid.NewGuid();
        var platformB = Guid.NewGuid();
        var lens = Guid.NewGuid();

        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), platformA, lens, Array.Empty<Guid>(),
                BrandMentioned: true, BrandRecommended: true, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceClassification>()),
            new AnswerSetup(Guid.NewGuid(), platformB, lens, Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceClassification>()));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        rows.Where(r => r.Scope == ScanMetricScope.Platform && r.ScopeId == platformA)
            .Single(r => r.MetricName == MetricNames.BrandMentionRate)
            .MetricValue.Should().Be(1.0);
        rows.Where(r => r.Scope == ScanMetricScope.Platform && r.ScopeId == platformB)
            .Single(r => r.MetricName == MetricNames.BrandMentionRate)
            .MetricValue.Should().Be(0.0);
    }

    [Fact]
    public async Task Topic_SumsContributionsFromMultipleAnswers_AndHandlesAnswerMappedToMultipleTopics()
    {
        // Topic-scope subtlety: a single Prompt can be mapped to multiple Topics
        // via PromptTopic. Each answer contributes its signals + mentions +
        // citations to EVERY topic it's mapped to.
        var topic1 = Guid.NewGuid();
        var topic2 = Guid.NewGuid();
        var competitor = Guid.NewGuid();
        var platform = Guid.NewGuid();
        var lens = Guid.NewGuid();

        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            // Mapped to BOTH topics; contributes to both.
            new AnswerSetup(Guid.NewGuid(), platform, lens, new[] { topic1, topic2 },
                BrandMentioned: true, BrandRecommended: true, BrandRank: null,
                Mentions: new[] { (MentionEntityType.Competitor, competitor, false) },
                Citations: Array.Empty<SourceClassification>()),
            // Only topic1.
            new AnswerSetup(Guid.NewGuid(), platform, lens, new[] { topic1 },
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceClassification>()));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        // topic1 saw both answers: BrandMentionRate = 1/2.
        rows.Single(r => r.Scope == ScanMetricScope.Topic && r.ScopeId == topic1 && r.MetricName == MetricNames.BrandMentionRate)
            .MetricValue.Should().Be(0.5);
        // topic2 saw only one (mentioned) answer: BrandMentionRate = 1/1.
        rows.Single(r => r.Scope == ScanMetricScope.Topic && r.ScopeId == topic2 && r.MetricName == MetricNames.BrandMentionRate)
            .MetricValue.Should().Be(1.0);
    }

    [Fact]
    public async Task Competitor_EmitsMentionAndRecommendationCounts_OnlyForCompetitorsWithMentions()
    {
        var competitorA = Guid.NewGuid();
        var competitorB = Guid.NewGuid();
        var untouchedCompetitor = Guid.NewGuid(); // never mentioned

        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: new[]
                {
                    (MentionEntityType.Competitor, competitorA, true),
                    (MentionEntityType.Competitor, competitorB, false),
                },
                Citations: Array.Empty<SourceClassification>()),
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: new[] { (MentionEntityType.Competitor, competitorA, true) },
                Citations: Array.Empty<SourceClassification>()));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        rows.Single(r => r.Scope == ScanMetricScope.Competitor && r.ScopeId == competitorA && r.MetricName == MetricNames.MentionCount)
            .MetricValue.Should().Be(2);
        rows.Single(r => r.Scope == ScanMetricScope.Competitor && r.ScopeId == competitorA && r.MetricName == MetricNames.RecommendationCount)
            .MetricValue.Should().Be(2);
        rows.Single(r => r.Scope == ScanMetricScope.Competitor && r.ScopeId == competitorB && r.MetricName == MetricNames.MentionCount)
            .MetricValue.Should().Be(1);
        rows.Single(r => r.Scope == ScanMetricScope.Competitor && r.ScopeId == competitorB && r.MetricName == MetricNames.RecommendationCount)
            .MetricValue.Should().Be(0);
        // Competitor scope must NOT include the never-mentioned one — slice (c)
        // doesn't emit zero-rows for tracked entities that didn't show up.
        rows.Should().NotContain(r => r.Scope == ScanMetricScope.Competitor && r.ScopeId == untouchedCompetitor);
    }
}
