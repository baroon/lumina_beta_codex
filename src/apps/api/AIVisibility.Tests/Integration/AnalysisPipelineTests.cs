using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace AIVisibility.Tests.Integration;

/// <summary>
/// Phase 3 plan §6 commitment 3 ("Real pipeline integration test"). Exercises
/// the full extract→continue→aggregate pipeline against a realistic in-memory
/// fixture with a mocked OpenAI response per answer. Replaces — at unit-test
/// speed — the verify-e2e cycle that previously caught regressions like the
/// D13 absence-is-Unknown bug (which a unit test on SignalExtractor alone
/// missed because it tested the parser in isolation, not the full
/// answer→signal→aggregation chain).
///
/// Mocks <see cref="IOpenAiService"/> (the D8 test seam) and constructs the
/// real <see cref="SignalExtractor"/>, <see cref="SignalExtractionJob"/>, and
/// <see cref="MetricAggregationJob"/> against a single in-memory DbContext —
/// the same wiring the production DI graph produces, minus Hangfire's runtime
/// (which we don't test — that's a third-party concern).
/// </summary>
public class AnalysisPipelineTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    /// <summary>
    /// Realistic Phase 3 fixture: 1 Brand + tracked competitors (Acme/Beta) +
    /// tracked product (Pro) + a completed scan with 5 AIAnswers and a Queued
    /// AnalysisJob, ready for the pipeline to consume.
    /// </summary>
    private sealed record Fixture(
        Guid AnalysisJobId,
        Brand Brand,
        Competitor AcmeCompetitor,
        Competitor BetaCompetitor,
        Product Pro,
        List<AIAnswer> Answers);

    private static Fixture SeedFixture(AppDbContext ctx, int answerCount = 5)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Lumina",
            WebsiteUrl = "https://lumina.io",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Brand = brand,
            Name = "Pipeline test tracker",
            Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow,
        };
        var acme = new Competitor
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Acme",
            Domain = "acme.com",
        };
        var beta = new Competitor
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Beta",
            Domain = "beta.com",
        };
        var pro = new Product
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Pro",
        };

        var scan = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            TrackerConfiguration = tracker,
            TriggerType = ScanTriggerType.Manual,
            Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        };
        var platform = new AIPlatform
        {
            Id = Guid.NewGuid(),
            Code = "openai",
            Name = "OpenAI",
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

        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.Competitors.Add(acme);
        ctx.Competitors.Add(beta);
        ctx.TrackerCompetitors.Add(new TrackerCompetitor
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            CompetitorId = acme.Id,
        });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            CompetitorId = beta.Id,
        });
        ctx.Products.Add(pro);
        ctx.TrackerProducts.Add(new TrackerProduct
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            ProductId = pro.Id,
        });
        ctx.ScanRuns.Add(scan);
        ctx.AIPlatforms.Add(platform);
        ctx.Prompts.Add(prompt);

        var answers = new List<AIAnswer>();
        for (var i = 0; i < answerCount; i++)
        {
            var promptRun = new PromptRun
            {
                Id = Guid.NewGuid(),
                ScanRunId = scan.Id,
                PromptId = prompt.Id,
                AIPlatformId = platform.Id,
                Status = PromptRunStatus.Completed,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow,
            };
            var answer = new AIAnswer
            {
                Id = Guid.NewGuid(),
                PromptRunId = promptRun.Id,
                AnswerText = $"Answer #{i}",
                CreatedAt = DateTime.UtcNow,
            };
            ctx.PromptRuns.Add(promptRun);
            ctx.AIAnswers.Add(answer);
            answers.Add(answer);
        }

        var job = new AnalysisJob
        {
            Id = Guid.NewGuid(),
            ScanRunId = scan.Id,
            Status = AnalysisJobStatus.Queued,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.AnalysisJobs.Add(job);
        ctx.SaveChanges();
        return new Fixture(job.Id, brand, acme, beta, pro, answers);
    }

    private static (SignalExtractionJob Extract, MetricAggregationJob Aggregate) BuildJobs(
        AppDbContext ctx, IOpenAiService openAi, int concurrency = 5)
    {
        var extractor = new SignalExtractor(openAi, new Mock<ILogger<SignalExtractor>>().Object);
        var options = Options.Create(new AnalysisOptions { ExtractionConcurrency = concurrency });
        var extract = new SignalExtractionJob(
            ctx, extractor, options, new Mock<ILogger<SignalExtractionJob>>().Object);
        var aggregator = new MetricAggregator(ctx, new Mock<ILogger<MetricAggregator>>().Object);
        var aggregate = new MetricAggregationJob(
            ctx, aggregator, new Mock<ILogger<MetricAggregationJob>>().Object);
        return (extract, aggregate);
    }

    [Fact]
    public async Task FullPipeline_PersistsAllRowKinds_ResolvesEntities_ClassifiesCitations_HandlesFailureIsolation_AndCompletesJob()
    {
        using var ctx = NewContext();
        var fx = SeedFixture(ctx, answerCount: 5);

        // Five varied LLM envelopes — one per answer — exercising the full
        // spread of pipeline behaviors we care about:
        //   #0 happy path: tracked Brand mention + tracked Competitor (Acme)
        //                  + Owned/Competitor/ThirdParty citation triplet.
        //   #1 D13 absence coercion: brand_mentioned=false but LLM emits
        //                  NotRecommended/Negative — must be coerced to Unknown.
        //   #2 tracked Product mention path.
        //   #3 D19 untracked-Competitor candidate (LLM names "Gamma" which is
        //                  not in tracked competitors).
        //   #4 D3 per-answer failure: invalid JSON — extractor returns null,
        //                  siblings persist, scan does not fail.
        const string answer0 = """
            {
              "answer_signal": {
                "brand_mentioned": true, "brand_recommended": true,
                "brand_rank": 1, "brand_sentiment": "Positive",
                "brand_recommendation_strength": "Strong",
                "top_recommended_entity": "Lumina",
                "answer_has_ranking": true, "answer_has_comparison": false,
                "answer_has_citations": true, "confidence_score": 0.9
              },
              "mentions": [
                { "entity_type": "Brand", "name": "Lumina", "is_recommended": true,
                  "recommendation_strength": "Strong", "sentiment": "Positive",
                  "evidence_snippet": "Lumina is top.", "confidence_score": 0.95 },
                { "entity_type": "Competitor", "name": "Acme", "is_recommended": false,
                  "recommendation_strength": "Moderate", "sentiment": "Neutral",
                  "evidence_snippet": "Acme is solid.", "confidence_score": 0.8 }
              ],
              "citations": [
                { "source_name": "Lumina blog", "url": "https://blog.lumina.io/x", "confidence_score": 0.9 },
                { "source_name": "Acme",        "url": "https://acme.com/y",       "confidence_score": 0.85 },
                { "source_name": "Wikipedia",   "url": "https://en.wikipedia.org/z","confidence_score": 0.7 }
              ]
            }
            """;
        const string answer1 = """
            {
              "answer_signal": {
                "brand_mentioned": false, "brand_recommended": true,
                "brand_rank": 4, "brand_sentiment": "Negative",
                "brand_recommendation_strength": "NotRecommended",
                "top_recommended_entity": "Acme",
                "answer_has_ranking": true, "answer_has_comparison": true,
                "answer_has_citations": false, "confidence_score": 0.8
              },
              "mentions": [],
              "citations": []
            }
            """;
        const string answer2 = """
            {
              "answer_signal": {
                "brand_mentioned": false, "brand_recommended": false,
                "brand_rank": null, "brand_sentiment": "Unknown",
                "brand_recommendation_strength": "Unknown",
                "top_recommended_entity": null,
                "answer_has_ranking": false, "answer_has_comparison": false,
                "answer_has_citations": false, "confidence_score": 0.7
              },
              "mentions": [
                { "entity_type": "Product", "name": "Pro", "is_recommended": true,
                  "recommendation_strength": "Strong", "sentiment": "Positive",
                  "evidence_snippet": "Pro covers the use case.", "confidence_score": 0.85 }
              ],
              "citations": []
            }
            """;
        const string answer3 = """
            {
              "answer_signal": {
                "brand_mentioned": false, "brand_recommended": false,
                "brand_rank": null, "brand_sentiment": "Unknown",
                "brand_recommendation_strength": "Unknown",
                "top_recommended_entity": null,
                "answer_has_ranking": false, "answer_has_comparison": false,
                "answer_has_citations": false, "confidence_score": 0.7
              },
              "mentions": [
                { "entity_type": "Competitor", "name": "Gamma", "is_recommended": false,
                  "recommendation_strength": "Weak", "sentiment": "Neutral",
                  "evidence_snippet": "Gamma might also be relevant.", "confidence_score": 0.4 }
              ],
              "citations": []
            }
            """;
        const string answer4 = "this is not JSON at all";

        var openAi = new Mock<IOpenAiService>();
        // Concurrency=1 makes the SetupSequence ordering deterministic — without
        // it the parallel fanout would race the sequence and tests would flake.
        openAi
            .SetupSequence(s => s.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(answer0)
            .ReturnsAsync(answer1)
            .ReturnsAsync(answer2)
            .ReturnsAsync(answer3)
            .ReturnsAsync(answer4);

        var (extract, aggregate) = BuildJobs(ctx, openAi.Object, concurrency: 1);

        await extract.ExtractAsync(fx.AnalysisJobId, CancellationToken.None);
        // ScanExecutor wires the Hangfire ContinueWith — here we invoke aggregate
        // directly to test the contract the chain depends on.
        await aggregate.AggregateAsync(fx.AnalysisJobId, CancellationToken.None);

        // -- AnalysisJob status + timestamps --
        var job = await ctx.AnalysisJobs.AsNoTracking().FirstAsync(j => j.Id == fx.AnalysisJobId);
        job.Status.Should().Be(AnalysisJobStatus.Completed);
        job.ExtractStartedAt.Should().NotBeNull();
        job.ExtractCompletedAt.Should().NotBeNull();
        job.AggregateStartedAt.Should().NotBeNull();
        job.AggregateCompletedAt.Should().NotBeNull();
        job.AggregateCompletedAt.Should().BeOnOrAfter(job.AggregateStartedAt!.Value);
        job.ExtractCompletedAt.Should().BeOnOrAfter(job.ExtractStartedAt!.Value);
        job.ErrorMessage.Should().BeNull();

        // -- AnswerSignal: 4 of 5 (answer #4 returned bad JSON → null result) --
        var signals = await ctx.AnswerSignals.AsNoTracking().ToListAsync();
        signals.Should().HaveCount(4);

        // -- D13 absence coercion held on answer #1 even though LLM emitted
        //    NotRecommended/Negative/rank=4/recommended=true (the verify-e2e
        //    regression). This is the load-bearing assertion for §5.3.
        var absenceSignal = signals.Single(s => s.AIAnswerId == fx.Answers[1].Id);
        absenceSignal.BrandMentioned.Should().BeFalse();
        absenceSignal.BrandSentiment.Should().Be(Sentiment.Unknown);
        absenceSignal.BrandRecommendationStrength.Should().Be(RecommendationStrength.Unknown);
        absenceSignal.BrandRank.Should().BeNull();
        absenceSignal.BrandRecommended.Should().BeFalse();

        // -- Source counts on answer #0's signal match its classified citations.
        var citedSignal = signals.Single(s => s.AIAnswerId == fx.Answers[0].Id);
        citedSignal.OwnedSourceCount.Should().Be(1);
        citedSignal.CompetitorSourceCount.Should().Be(1);
        citedSignal.ThirdPartySourceCount.Should().Be(1);

        // -- Mention: tracked entities resolve to mentions, with correct EntityId. --
        var mentions = await ctx.Mentions.AsNoTracking().ToListAsync();
        mentions.Should().HaveCount(3); // Brand, Acme, Pro
        mentions.Should().ContainSingle(m =>
            m.EntityType == MentionEntityType.Brand && m.EntityId == fx.Brand.Id);
        mentions.Should().ContainSingle(m =>
            m.EntityType == MentionEntityType.Competitor && m.EntityId == fx.AcmeCompetitor.Id);
        mentions.Should().ContainSingle(m =>
            m.EntityType == MentionEntityType.Product && m.EntityId == fx.Pro.Id);

        // -- MentionCandidate: untracked "Gamma" preserved, not as a mention. --
        var candidates = await ctx.MentionCandidates.AsNoTracking().ToListAsync();
        candidates.Should().ContainSingle();
        candidates[0].ClaimedName.Should().Be("Gamma");
        candidates[0].NormalizedName.Should().Be("gamma");

        // -- Citation classification by domain. --
        var citations = await ctx.Citations.AsNoTracking().ToListAsync();
        citations.Should().HaveCount(3);
        citations.Single(c => c.NormalizedDomain == "blog.lumina.io")
            .Classification.Should().Be(SourceClassification.Owned);
        citations.Single(c => c.NormalizedDomain == "acme.com")
            .Classification.Should().Be(SourceClassification.Competitor);
        citations.Single(c => c.NormalizedDomain == "en.wikipedia.org")
            .Classification.Should().Be(SourceClassification.ThirdParty);
        citations.Should().AllSatisfy(c => c.CitationType.Should().Be(CitationType.ExplicitUrl));

        // -- ScanMetric (Slice (c)) --
        var metrics = await ctx.ScanMetrics.AsNoTracking().ToListAsync();
        // The fixture exercises 1 platform + 1 lens + 0 topics (the seed doesn't
        // create PromptTopic rows). Acme is the only competitor mentioned.
        //
        // Non-Competitor scope base: 10 metrics — BrandMentionRate, Brand-
        // RecommendationRate, AverageBrandRank (1 signal had rank=1),
        // CompetitorMentionCount, ProductMentionCount, CitationCount,
        // OwnedCitationCount, CompetitorCitationCount, ThirdPartyCitationCount,
        // UnknownCitationCount.
        //
        // Overall scope only also emits the Slice-(c)-followup aggregates:
        //   +1 BrandShareOfVoice (1 brand mention vs 1 competitor mention = 0.5)
        //   +2 BrandSentimentDistribution (Positive ×1, Unknown ×3 — D13
        //      coerced answer #1's Negative to Unknown)
        //   +3 TopCitedSource (3 distinct sources on answer #0)
        // = 16 at Overall.
        //
        // Competitor scope: 2 metrics (MentionCount + RecommendationCount).
        metrics.Where(m => m.Scope == ScanMetricScope.Overall).Should().HaveCount(16);
        metrics.Where(m => m.Scope == ScanMetricScope.Platform).Should().HaveCount(10);
        metrics.Where(m => m.Scope == ScanMetricScope.Lens).Should().HaveCount(10);
        metrics.Where(m => m.Scope == ScanMetricScope.Competitor).Should().HaveCount(2);
        metrics.Where(m => m.Scope == ScanMetricScope.Topic).Should().BeEmpty();
        metrics.Should().HaveCount(38);

        // The four classification counts MUST sum to CitationCount — the
        // invariant added in the UnknownCitationCount fix.
        var overallSum =
            metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.OwnedCitationCount).MetricValue +
            metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.CompetitorCitationCount).MetricValue +
            metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.ThirdPartyCitationCount).MetricValue +
            metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.UnknownCitationCount).MetricValue;
        overallSum.Should().Be(metrics.Single(m =>
            m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.CitationCount).MetricValue);

        // BrandMentionRate: 2/4 signals (answers 0+2 have brand mentions
        // via the extracted Mention rows — Slice 2's BrandMentioned signal
        // is what the metric reads; answer 0 has BrandMentioned=true,
        // answer 1 was coerced false, answer 2 false, answer 3 false).
        var overallBrandRate = metrics.Single(m =>
            m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.BrandMentionRate);
        overallBrandRate.MetricValue.Should().BeApproximately(0.25, 1e-9); // 1/4

        // CitationCount Overall = 3 (all from answer 0).
        metrics.Single(m =>
            m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.CitationCount)
            .MetricValue.Should().Be(3);

        // AverageBrandRank = 1 (only answer 0 contributed rank=1; absence-coerced answer 1
        // had its rank=4 nulled by the D13 guard).
        metrics.Single(m =>
            m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.AverageBrandRank)
            .MetricValue.Should().BeApproximately(1.0, 1e-9);

        // Competitor scope: Acme mentioned once, not recommended.
        var acmeMentionCount = metrics.Single(m =>
            m.Scope == ScanMetricScope.Competitor &&
            m.ScopeId == fx.AcmeCompetitor.Id &&
            m.MetricName == MetricNames.MentionCount);
        acmeMentionCount.MetricValue.Should().Be(1);
        metrics.Single(m =>
            m.Scope == ScanMetricScope.Competitor &&
            m.ScopeId == fx.AcmeCompetitor.Id &&
            m.MetricName == MetricNames.RecommendationCount)
            .MetricValue.Should().Be(0);
    }

    [Fact]
    public async Task FullPipeline_WithZeroAnswers_StillCompletesJobThroughAggregate()
    {
        // Edge case the production pipeline must survive: a scan whose
        // prompt_runs all failed before producing AIAnswers. Extract finds
        // nothing to do but still stamps timestamps; aggregate skeleton
        // flips Status=Completed.
        using var ctx = NewContext();
        var fx = SeedFixture(ctx, answerCount: 0);

        var openAi = new Mock<IOpenAiService>(); // Never called.
        var (extract, aggregate) = BuildJobs(ctx, openAi.Object);

        await extract.ExtractAsync(fx.AnalysisJobId, CancellationToken.None);
        await aggregate.AggregateAsync(fx.AnalysisJobId, CancellationToken.None);

        var job = await ctx.AnalysisJobs.AsNoTracking().FirstAsync(j => j.Id == fx.AnalysisJobId);
        job.Status.Should().Be(AnalysisJobStatus.Completed);
        (await ctx.AnswerSignals.CountAsync()).Should().Be(0);

        openAi.Verify(
            s => s.ChatCompletionAsync(It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
