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
///
/// Phase 4 Slice 0: classification + source name now live on the normalized
/// Source / BrandSourceClassification rows the seeder builds alongside each
/// citation, not on the citation row itself. The 12-value SourceType taxonomy
/// is used in seeds; <see cref="ThirdParty"/> stands in for any of the
/// "Editorial/UGC/Corporate/..." values that the aggregator buckets into the
/// ThirdParty reporting count.
/// </summary>
public class MetricAggregatorTests
{
    // Stand-in SourceType for the ThirdParty reporting bucket. Aggregator
    // buckets every SourceType except Owned/Competitor/Unknown into ThirdParty.
    private const SourceType ThirdParty = SourceType.Editorial;

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
        IEnumerable<SourceType> Citations)
    {
        /// <summary>Optional: overrides AnswerSignal.BrandSentiment. Default Unknown.</summary>
        public Sentiment BrandSentiment { get; init; } = Sentiment.Unknown;

        /// <summary>
        /// Optional: when set, takes precedence over <see cref="Citations"/> and lets the
        /// test give each citation a distinct source name (for top-cited-sources tests).
        /// </summary>
        public IReadOnlyList<(SourceType Class, string Source)>? NamedCitations { get; init; }
    }

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
        // Cross-answer Source dedup for NamedCitations: same source name on
        // multiple answers collapses to one Source row + one BrandSourceClassification.
        var sourceByName = new Dictionary<string, Source>();

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
                BrandSentiment = a.BrandSentiment,
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

            // NamedCitations takes precedence over Citations when set, so a test
            // can give each citation a unique source name (top-cited-sources).
            if (a.NamedCitations is { Count: > 0 } named)
            {
                foreach (var (cls, name) in named)
                {
                    AddCitation(ctx, brand.Id, answer.Id, name, cls, sourceByName);
                }
            }
            else
            {
                // Unnamed citations: each gets a unique Source so the per-source
                // classification is independent. The aggregator buckets by
                // SourceType, not by source name, so distinct source names here
                // don't change the count metrics — only TopCitedSource cares
                // about names, and unnamed-citation tests don't assert on it.
                var idx = 0;
                foreach (var c in a.Citations)
                {
                    var name = $"src-{answer.Id:N}-{idx++}";
                    AddCitation(ctx, brand.Id, answer.Id, name, c, sourceByName);
                }
            }
        }

        ctx.SaveChanges();
        return scan.Id;
    }

    /// <summary>
    /// Adds one Citation row + the Source / BrandSourceClassification rows it
    /// depends on, deduping Source rows by name across the scan.
    /// </summary>
    private static void AddCitation(
        AppDbContext ctx, Guid brandId, Guid aiAnswerId, string sourceName,
        SourceType sourceType, Dictionary<string, Source> sourceByName)
    {
        if (!sourceByName.TryGetValue(sourceName, out var source))
        {
            source = new Source
            {
                Id = Guid.NewGuid(),
                SourceName = sourceName,
                CreatedAt = DateTime.UtcNow,
            };
            ctx.Sources.Add(source);
            ctx.BrandSourceClassifications.Add(new BrandSourceClassification
            {
                Id = Guid.NewGuid(),
                BrandId = brandId,
                SourceId = source.Id,
                SourceType = sourceType,
                ConfidenceScore = 1.0,
                ProvenanceSource = ClassificationSource.RuleBased,
                Status = sourceType == SourceType.Unknown
                    ? ClassificationStatus.Unknown
                    : ClassificationStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            sourceByName[sourceName] = source;
        }

        ctx.Citations.Add(new Citation
        {
            Id = Guid.NewGuid(),
            AIAnswerId = aiAnswerId,
            SourceId = source.Id,
            CitationType = CitationType.ExplicitUrl,
            ConfidenceScore = 1.0,
            CreatedAt = DateTime.UtcNow,
        });
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
                Citations: new[] { SourceType.Owned, SourceType.Competitor }),
            // Answer 1: brand mentioned, not recommended, rank=3, 1 third-party citation, 1 product mention.
            new AnswerSetup(Guid.NewGuid(), platformA, lensA, Array.Empty<Guid>(),
                BrandMentioned: true, BrandRecommended: false, BrandRank: 3,
                Mentions: new[] { (MentionEntityType.Product, productA, false) },
                Citations: new[] { ThirdParty }),
            // Answer 2: brand absent, 1 competitor mention (other competitor).
            new AnswerSetup(Guid.NewGuid(), platformA, lensA, Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: new[] { (MentionEntityType.Competitor, competitorB, false) },
                Citations: Array.Empty<SourceType>()));

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
    public async Task UnknownCitationCount_IsEmitted_AndAccountsForCitationsWithNoUrl()
    {
        // verify-e2e against gpt-4o-mini consistently shows the LLM emitting
        // source names without URLs ("according to Trustpilot"-style citations).
        // Those get classification=Unknown. Without an UnknownCitationCount
        // metric, the four breakdown counts (Owned+Competitor+ThirdParty) sum
        // to less than CitationCount, leaving "missing" citations invisible to
        // reporting. The aggregator MUST emit UnknownCitationCount alongside
        // the other three so the breakdown is complete.
        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: new[]
                {
                    SourceType.Unknown,
                    SourceType.Unknown,
                    SourceType.Owned,
                }));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);
        var overall = rows.Where(r => r.Scope == ScanMetricScope.Overall).ToList();

        overall.Single(r => r.MetricName == MetricNames.CitationCount)
            .MetricValue.Should().Be(3);
        overall.Single(r => r.MetricName == MetricNames.OwnedCitationCount)
            .MetricValue.Should().Be(1);
        overall.Single(r => r.MetricName == MetricNames.CompetitorCitationCount)
            .MetricValue.Should().Be(0);
        overall.Single(r => r.MetricName == MetricNames.ThirdPartyCitationCount)
            .MetricValue.Should().Be(0);
        overall.Single(r => r.MetricName == MetricNames.UnknownCitationCount)
            .MetricValue.Should().Be(2);

        // The four breakdowns must sum to CitationCount — the invariant that
        // motivates having UnknownCitationCount at all.
        var sum =
            overall.Single(r => r.MetricName == MetricNames.OwnedCitationCount).MetricValue +
            overall.Single(r => r.MetricName == MetricNames.CompetitorCitationCount).MetricValue +
            overall.Single(r => r.MetricName == MetricNames.ThirdPartyCitationCount).MetricValue +
            overall.Single(r => r.MetricName == MetricNames.UnknownCitationCount).MetricValue;
        sum.Should().Be(overall.Single(r => r.MetricName == MetricNames.CitationCount).MetricValue);
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
                Citations: Array.Empty<SourceType>()));

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
                Citations: Array.Empty<SourceType>()),
            new AnswerSetup(Guid.NewGuid(), platformB, lens, Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceType>()));

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
                Citations: Array.Empty<SourceType>()),
            // Only topic1.
            new AnswerSetup(Guid.NewGuid(), platform, lens, new[] { topic1 },
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceType>()));

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
                Citations: Array.Empty<SourceType>()),
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: new[] { (MentionEntityType.Competitor, competitorA, true) },
                Citations: Array.Empty<SourceType>()));

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

    [Fact]
    public async Task BrandShareOfVoice_IsBrandMentionsDividedByBrandPlusCompetitorMentions()
    {
        // SoV definition (ADR-003): the brand's share of voice = brand mentions
        // / (brand mentions + competitor mentions). Products don't count toward
        // the denominator — they're a different conversation. Value is in [0, 1].
        var brandId = Guid.NewGuid();
        var competitorA = Guid.NewGuid();

        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: true, BrandRecommended: false, BrandRank: null,
                Mentions: new[]
                {
                    (MentionEntityType.Brand, brandId, true),
                    (MentionEntityType.Competitor, competitorA, false),
                    (MentionEntityType.Competitor, competitorA, false),
                },
                Citations: Array.Empty<SourceType>()));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        // 1 brand mention / (1 brand + 2 competitor) = 1/3.
        rows.Single(r => r.Scope == ScanMetricScope.Overall && r.MetricName == MetricNames.BrandShareOfVoice)
            .MetricValue.Should().BeApproximately(1.0 / 3.0, 1e-9);
    }

    [Fact]
    public async Task BrandShareOfVoice_Omitted_WhenNoBrandOrCompetitorMentions()
    {
        // Denominator-zero guard: no brand AND no competitor mentions means
        // there's no "voice" to share. Skip the metric rather than emit 0 or
        // NaN.
        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceType>()));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        rows.Should().NotContain(r => r.MetricName == MetricNames.BrandShareOfVoice);
    }

    [Fact]
    public async Task BrandSentimentDistribution_EmitsOneRowPerObservedSentimentValue()
    {
        // SentimentDistribution as multiple rows (one per sentiment value with
        // metadata_json identifying which value), rather than a single jsonb
        // row, so the breakdown is queryable in plain SQL. Counts include
        // Unknown — that's a real value, not absence.
        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            // 3 Positive, 2 Neutral, 1 Negative, 1 Unknown.
            BuildSentimentAnswer(Sentiment.Positive),
            BuildSentimentAnswer(Sentiment.Positive),
            BuildSentimentAnswer(Sentiment.Positive),
            BuildSentimentAnswer(Sentiment.Neutral),
            BuildSentimentAnswer(Sentiment.Neutral),
            BuildSentimentAnswer(Sentiment.Negative),
            BuildSentimentAnswer(Sentiment.Unknown));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);
        var distribution = rows
            .Where(r => r.Scope == ScanMetricScope.Overall && r.MetricName == MetricNames.BrandSentimentDistribution)
            .ToList();

        ExpectSentimentCount(distribution, "Positive", 3);
        ExpectSentimentCount(distribution, "Neutral", 2);
        ExpectSentimentCount(distribution, "Negative", 1);
        ExpectSentimentCount(distribution, "Unknown", 1);
        // Mixed not observed in this scan; the metric should NOT emit a zero row
        // for unobserved values — distribution shape matches reality, not the enum.
        distribution.Should().NotContain(r => r.MetadataJson != null && r.MetadataJson.Contains("Mixed"));
    }

    private static AnswerSetup BuildSentimentAnswer(Sentiment sentiment) =>
        new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
            BrandMentioned: sentiment != Sentiment.Unknown,
            BrandRecommended: false,
            BrandRank: null,
            Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
            Citations: Array.Empty<SourceType>())
        { BrandSentiment = sentiment };

    private static void ExpectSentimentCount(List<ScanMetric> distribution, string sentimentValue, int expectedCount)
    {
        var row = distribution.Single(r =>
            r.MetadataJson != null && r.MetadataJson.Contains($"\"{sentimentValue}\""));
        row.MetricValue.Should().Be(expectedCount, $"expected {expectedCount} signals at sentiment={sentimentValue}");
    }

    [Fact]
    public async Task TopCitedSource_EmitsTop5_RankedByCitationCount()
    {
        // Top-K most-cited sources for the scan. Ties broken by source name
        // (deterministic ordering for tests). Capped at 5 — if there are 4
        // distinct sources, only 4 rows. metadata_json carries the source
        // name + rank (1-based) so reporting can render the leaderboard
        // without a second query.
        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceType>())
            {
                NamedCitations = new[]
                {
                    (ThirdParty, "Trustpilot"),
                    (ThirdParty, "Trustpilot"),
                    (ThirdParty, "Trustpilot"),
                    (ThirdParty, "G2"),
                    (ThirdParty, "G2"),
                    (ThirdParty, "Wikipedia"),
                    (SourceType.Unknown, "BlogPost"),
                },
            });

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);
        var top = rows
            .Where(r => r.Scope == ScanMetricScope.Overall && r.MetricName == MetricNames.TopCitedSource)
            .OrderByDescending(r => r.MetricValue)
            .ThenBy(r => r.MetadataJson)
            .ToList();

        top.Should().HaveCount(4);   // four distinct sources, not 5
        top[0].MetricValue.Should().Be(3); // Trustpilot
        // Phase 4 Slice 0: aggregator groups by Source.SourceName (raw display
        // name from the Source row), not by NormalizedSourceName — the
        // normalization column has moved off the Citation onto Source's
        // own normalized_domain.
        top[0].MetadataJson.Should().Contain("Trustpilot").And.Contain("\"rank\":1");
        top[1].MetricValue.Should().Be(2); // G2
        top[1].MetadataJson.Should().Contain("G2").And.Contain("\"rank\":2");
        top[2].MetricValue.Should().Be(1);
        top[3].MetricValue.Should().Be(1);
    }

    [Fact]
    public async Task ShareOfVoice_SentimentDistribution_TopCitedSource_AllEmitAtPlatformAndLensScopes()
    {
        // Coverage extension: the 3 Slice-(c)-followup aggregates now emit at
        // every non-Competitor scope (Overall, Platform, Lens, Topic). Per-
        // competitor variants don't fit the semantics (SoV/sentiment/top-cited
        // are scan-centric or brand-centric, not entity-centric).
        var platformA = Guid.NewGuid();
        var platformB = Guid.NewGuid();
        var lensA = Guid.NewGuid();
        var brandId = Guid.NewGuid();
        var competitorId = Guid.NewGuid();

        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            // Platform A: 1 brand mention + 1 competitor mention + 1 citation.
            new AnswerSetup(Guid.NewGuid(), platformA, lensA, Array.Empty<Guid>(),
                BrandMentioned: true, BrandRecommended: true, BrandRank: null,
                Mentions: new[]
                {
                    (MentionEntityType.Brand, brandId, true),
                    (MentionEntityType.Competitor, competitorId, false),
                },
                Citations: Array.Empty<SourceType>())
            {
                BrandSentiment = Sentiment.Positive,
                NamedCitations = new[] { (SourceType.Owned, "Lumina") },
            },
            // Platform B: 0 brand, 2 competitor mentions, no citations.
            new AnswerSetup(Guid.NewGuid(), platformB, lensA, Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: new[]
                {
                    (MentionEntityType.Competitor, competitorId, false),
                    (MentionEntityType.Competitor, competitorId, false),
                },
                Citations: Array.Empty<SourceType>())
            { BrandSentiment = Sentiment.Unknown });

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        // Platform A: 1 brand / (1 + 1 competitor) = 0.5.
        rows.Single(r => r.Scope == ScanMetricScope.Platform && r.ScopeId == platformA && r.MetricName == MetricNames.BrandShareOfVoice)
            .MetricValue.Should().BeApproximately(0.5, 1e-9);
        // Platform B: 0 brand / (0 + 2) = 0.
        rows.Single(r => r.Scope == ScanMetricScope.Platform && r.ScopeId == platformB && r.MetricName == MetricNames.BrandShareOfVoice)
            .MetricValue.Should().Be(0.0);

        // Sentiment distribution: Platform A has Positive ×1, Platform B has Unknown ×1.
        rows.Single(r => r.Scope == ScanMetricScope.Platform && r.ScopeId == platformA
                && r.MetricName == MetricNames.BrandSentimentDistribution
                && r.MetadataJson != null && r.MetadataJson.Contains("Positive"))
            .MetricValue.Should().Be(1);
        rows.Single(r => r.Scope == ScanMetricScope.Platform && r.ScopeId == platformB
                && r.MetricName == MetricNames.BrandSentimentDistribution
                && r.MetadataJson != null && r.MetadataJson.Contains("Unknown"))
            .MetricValue.Should().Be(1);

        // TopCitedSource at Platform A: just "Lumina". Platform B: no citations.
        rows.Where(r => r.Scope == ScanMetricScope.Platform && r.ScopeId == platformA && r.MetricName == MetricNames.TopCitedSource)
            .Should().ContainSingle();
        rows.Where(r => r.Scope == ScanMetricScope.Platform && r.ScopeId == platformB && r.MetricName == MetricNames.TopCitedSource)
            .Should().BeEmpty();

        // Lens A sees both answers: 1 brand mention vs (1 + 2 = 3) competitor
        // mentions → SoV = 1/4.
        rows.Single(r => r.Scope == ScanMetricScope.Lens && r.ScopeId == lensA && r.MetricName == MetricNames.BrandShareOfVoice)
            .MetricValue.Should().BeApproximately(0.25, 1e-9);
        // Lens A sentiment: 1 Positive + 1 Unknown = 2 rows.
        rows.Where(r => r.Scope == ScanMetricScope.Lens && r.ScopeId == lensA && r.MetricName == MetricNames.BrandSentimentDistribution)
            .Should().HaveCount(2);

        // Competitor scope emits its per-competitor metrics: MentionCount,
        // RecommendationCount (existing) + CoMentionedWithBrandCount (added
        // with the co-mention slice). The 3 Slice-(c) aggregates (SoV /
        // SentimentDist / TopCited) remain scan/brand-centric and do not
        // bleed in here.
        rows.Where(r => r.Scope == ScanMetricScope.Competitor && r.ScopeId == competitorId)
            .Select(r => r.MetricName)
            .Should().BeEquivalentTo(new[]
            {
                MetricNames.MentionCount,
                MetricNames.RecommendationCount,
                MetricNames.CoMentionedWithBrandCount,
                MetricNames.CompetitorShareOfVoice,
                MetricNames.CompetitorRecommendationShare,
            });
    }

    [Fact]
    public async Task Momentum_EmitsDeltasVsPreviousCompletedScanOnSameTracker()
    {
        // Seed a "previous" ScanRun on the same tracker with hand-picked
        // Overall-scope metric rows, then run the aggregator on a "current"
        // scan and verify the momentum rows = current - previous.
        using var ctx = NewContext();
        var brandId = Guid.NewGuid();
        var brand = new Brand { Id = brandId, Name = "B", WebsiteUrl = "https://b.io" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T",
            Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var previousScan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-1),
            CompletedAt = DateTime.UtcNow.AddDays(-1),
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(previousScan);
        // Hand-seed previous-scan headline metrics: mention rate 0.20, SoV 0.50,
        // absence 0.70.
        var now = DateTime.UtcNow;
        void Seed(string name, double value)
        {
            ctx.ScanMetrics.Add(new ScanMetric
            {
                Id = Guid.NewGuid(), ScanRunId = previousScan.Id,
                Scope = ScanMetricScope.Overall, ScopeId = null,
                MetricName = name, MetricValue = value, CreatedAt = now,
            });
        }
        Seed(MetricNames.BrandMentionRate, 0.20);
        Seed(MetricNames.BrandShareOfVoice, 0.50);
        Seed(MetricNames.BrandAbsenceRate, 0.70);
        ctx.SaveChanges();

        // Current scan seeded via the standard helper — sets up a separate
        // tracker, so cross-tracker contamination check passes.
        var platform = Guid.NewGuid();
        var lens = Guid.NewGuid();
        var currentScanId = SeedScanAndAnswers(ctx,
            // One answer with the brand mentioned and 1 competitor mention so
            // BrandMentionRate=1.0, BrandShareOfVoice=0.5, BrandAbsenceRate=0.
            new AnswerSetup(Guid.NewGuid(), platform, lens, Array.Empty<Guid>(),
                BrandMentioned: true, BrandRecommended: true, BrandRank: null,
                Mentions: new[]
                {
                    (MentionEntityType.Brand, brandId, true),
                    (MentionEntityType.Competitor, Guid.NewGuid(), false),
                },
                Citations: Array.Empty<SourceType>()));

        // Re-parent the helper's scan onto the seeded tracker so the previous-
        // scan lookup walks the right history. Need to also push StartedAt
        // ahead of the previous scan.
        var current = ctx.ScanRuns.Find(currentScanId)!;
        current.TrackerConfigurationId = tracker.Id;
        current.StartedAt = DateTime.UtcNow;
        ctx.SaveChanges();

        var rows = await NewAggregator(ctx).ComputeAsync(currentScanId, CancellationToken.None);

        // BrandMentionRate current = 1/1 = 1.0; previous = 0.20; delta = +0.80.
        rows.Single(r => r.Scope == ScanMetricScope.Overall && r.ScopeId == null
                     && r.MetricName == MetricNames.BrandMentionRateMomentum)
            .MetricValue.Should().BeApproximately(0.80, 1e-9);
        // BrandShareOfVoice current = 1/2 = 0.5; previous = 0.50; delta = 0.
        rows.Single(r => r.Scope == ScanMetricScope.Overall && r.ScopeId == null
                     && r.MetricName == MetricNames.BrandShareOfVoiceMomentum)
            .MetricValue.Should().BeApproximately(0.0, 1e-9);
        // BrandAbsenceRate current = 0/1 = 0; previous = 0.70; delta = -0.70.
        rows.Single(r => r.Scope == ScanMetricScope.Overall && r.ScopeId == null
                     && r.MetricName == MetricNames.BrandAbsenceRateMomentum)
            .MetricValue.Should().BeApproximately(-0.70, 1e-9);
    }

    [Fact]
    public async Task Momentum_EmitsNothing_OnFirstScanForTracker()
    {
        // No previous completed scan exists → momentum rows are absent
        // entirely (not zero, not null — the metric just doesn't appear).
        using var ctx = NewContext();
        var platform = Guid.NewGuid();
        var lens = Guid.NewGuid();
        var brandId = Guid.NewGuid();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), platform, lens, Array.Empty<Guid>(),
                BrandMentioned: true, BrandRecommended: true, BrandRank: null,
                Mentions: new[] { (MentionEntityType.Brand, brandId, true) },
                Citations: Array.Empty<SourceType>()));

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        rows.Where(r => r.MetricName == MetricNames.BrandMentionRateMomentum
                     || r.MetricName == MetricNames.BrandShareOfVoiceMomentum
                     || r.MetricName == MetricNames.BrandAbsenceRateMomentum)
            .Should().BeEmpty();
    }

    [Fact]
    public async Task ShareOfVoice_EmitsAtTopicScope_WhenAnswerMapsToTopic()
    {
        // Topic scope test: an answer mapped to a topic should produce per-topic
        // SoV / Sentiment / TopCited rows just like Platform/Lens. Topic is the
        // scope reporting cares most about for "what topics are we missing on?"
        var topicId = Guid.NewGuid();
        var brandId = Guid.NewGuid();
        var competitorId = Guid.NewGuid();

        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new[] { topicId },
                BrandMentioned: true, BrandRecommended: true, BrandRank: null,
                Mentions: new[]
                {
                    (MentionEntityType.Brand, brandId, true),
                    (MentionEntityType.Competitor, competitorId, false),
                },
                Citations: Array.Empty<SourceType>())
            { BrandSentiment = Sentiment.Positive });

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);

        rows.Single(r => r.Scope == ScanMetricScope.Topic && r.ScopeId == topicId && r.MetricName == MetricNames.BrandShareOfVoice)
            .MetricValue.Should().BeApproximately(0.5, 1e-9);
        rows.Single(r => r.Scope == ScanMetricScope.Topic && r.ScopeId == topicId && r.MetricName == MetricNames.BrandSentimentDistribution
                && r.MetadataJson != null && r.MetadataJson.Contains("Positive"))
            .MetricValue.Should().Be(1);
    }

    [Fact]
    public async Task TopCitedSource_MetadataJson_IsValidJson_EvenForSourceNamesWithSpecialChars()
    {
        // verify-e2e on 2026-05-27 caught the production bug here: the
        // aggregator built metadata_json with string interpolation that did
        // not quote the source name. Real LLM source names contain spaces,
        // parens, and other characters that need JSON escaping ("American
        // Society of Landscape Architects (ASLA)"). The in-memory EF
        // provider does not validate jsonb, so the unit tests passed; Postgres
        // jsonb rejected the row and the whole aggregation transaction
        // rolled back.
        //
        // This test exercises the same shape that broke prod: source names
        // with mixed-case + parens + spaces. The assertion is that the
        // emitted metadata_json parses as valid JSON.
        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceType>())
            {
                NamedCitations = new[]
                {
                    (ThirdParty, "American Society of Landscape Architects (ASLA)"),
                    (ThirdParty, "Source with \"quotes\" inside"),
                    (ThirdParty, "Source\\with\\backslashes"),
                },
            });

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);
        var topCited = rows.Where(r =>
            r.Scope == ScanMetricScope.Overall && r.MetricName == MetricNames.TopCitedSource).ToList();

        topCited.Should().HaveCount(3);
        foreach (var row in topCited)
        {
            row.MetadataJson.Should().NotBeNull();
            // Must parse cleanly — same validation Postgres jsonb performs.
            var act = () => System.Text.Json.JsonDocument.Parse(row.MetadataJson!);
            act.Should().NotThrow($"metadata_json must be valid JSON, got: {row.MetadataJson}");
        }
    }

    [Fact]
    public async Task TopCitedSource_CappedAtFive_WhenManyDistinctSources()
    {
        using var ctx = NewContext();
        var scanRunId = SeedScanAndAnswers(ctx,
            new AnswerSetup(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Array.Empty<Guid>(),
                BrandMentioned: false, BrandRecommended: false, BrandRank: null,
                Mentions: Array.Empty<(MentionEntityType, Guid, bool)>(),
                Citations: Array.Empty<SourceType>())
            {
                NamedCitations = Enumerable.Range(1, 8)
                    .Select(i => (ThirdParty, $"Source{i:D2}"))
                    .ToList(),
            });

        var rows = await NewAggregator(ctx).ComputeAsync(scanRunId, CancellationToken.None);
        rows.Where(r => r.Scope == ScanMetricScope.Overall && r.MetricName == MetricNames.TopCitedSource)
            .Should().HaveCount(5);
    }
}
