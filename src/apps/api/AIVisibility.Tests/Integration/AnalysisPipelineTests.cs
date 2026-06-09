using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using AIVisibility.Infrastructure.Data;
using AIVisibility.Tests.TestHelpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
/// real <see cref="SignalExtractor"/>, <see cref="AnswerSignalWriter"/>, and
/// <see cref="MetricAggregationJob"/> against a single in-memory DbContext —
/// the same wiring the production DI graph produces, minus Hangfire's runtime
/// (which we don't test — that's a third-party concern). Extraction now runs
/// inline-per-answer (as in ScanExecutor); the test helper
/// <see cref="RunInlineExtractionAsync"/> mirrors that loop.
///
/// Phase 4 Slice 0: the persistence path now produces the full Source /
/// SourceUrl / BrandSourceClassification chain. The pipeline test asserts on
/// the joined view of (citation → source → classification) instead of inline
/// citation columns.
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
            TrackerConfigurationId = tracker.Id,
            CompetitorId = acme.Id,
        });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor
        {
            TrackerConfigurationId = tracker.Id,
            CompetitorId = beta.Id,
        });
        ctx.Products.Add(pro);
        ctx.TrackerProducts.Add(new TrackerProduct
        {
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

    private sealed record Pipeline(
        SignalExtractor Extractor,
        AnswerSignalWriter Writer,
        SignalExtractionContextFactory ContextFactory,
        MetricAggregationJob Aggregate);

    private static Pipeline BuildPipeline(
        AppDbContext ctx, IOpenAiService openAi, ISourceClassifier? classifier = null)
    {
        var extractor = new SignalExtractor(openAi, new Mock<ILogger<SignalExtractor>>().Object);
        // Phase 4 Slice 1: AnswerSignalWriter now takes ISourceClassifier.
        // Tests that don't care default to a stub returning null per call —
        // leaves rows at their RuleBased verdict (the pre-Phase 4 behavior
        // the existing assertions were written for).
        classifier ??= new Mock<ISourceClassifier>().Object;
        var authorityClassifier = new CuratedSourceAuthorityClassifier();
        var writer = new AnswerSignalWriter(
            ctx, classifier, authorityClassifier, new Mock<ILogger<AnswerSignalWriter>>().Object);
        var contextFactory = new SignalExtractionContextFactory(ctx);
        var aggregator = new MetricAggregator(ctx, new Mock<ILogger<MetricAggregator>>().Object);
        var aggregate = new MetricAggregationJob(
            ctx, aggregator, new Mock<ILogger<MetricAggregationJob>>().Object);
        return new Pipeline(extractor, writer, contextFactory, aggregate);
    }

    /// <summary>
    /// Runs the inline-extraction step the way ScanExecutor does in
    /// production: build context once per scan, then extract + write
    /// per answer. Per-answer extraction failures are swallowed so the
    /// rest of the scan persists (D3). Stamps the AnalysisJob
    /// extract timestamps + Status=Running, which the aggregate step
    /// then flips to Completed.
    /// </summary>
    private static async Task RunInlineExtractionAsync(
        AppDbContext ctx, Guid analysisJobId, IReadOnlyList<AIAnswer> answers, Pipeline pipe)
    {
        var job = await ctx.AnalysisJobs.FirstAsync(j => j.Id == analysisJobId);
        job.Status = AnalysisJobStatus.Running;
        job.ExtractStartedAt = DateTime.UtcNow;
        await ctx.SaveChangesAsync();

        var context = await pipe.ContextFactory.BuildAsync(job.ScanRunId, CancellationToken.None);

        foreach (var answer in answers)
        {
            try
            {
                var result = await pipe.Extractor.ExtractAsync(answer, context, CancellationToken.None);
                if (result is null) continue;
                await pipe.Writer.WriteAsync(result, context, CancellationToken.None);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // D3 catch-and-continue parity with ScanExecutor.
                _ = ex;
            }
        }

        job.ExtractCompletedAt = DateTime.UtcNow;
        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task FullPipeline_PersistsAllRowKinds_ResolvesEntities_ClassifiesCitations_HandlesFailureIsolation_AndCompletesJob()
    {
        using var ctx = NewContext();
        var fx = SeedFixture(ctx, answerCount: 5);

        // Five varied LLM envelopes — one per answer — exercising the full
        // spread of pipeline behaviors we care about:
        //   #0 happy path: tracked Brand mention + tracked Competitor (Acme)
        //                  + Owned/Competitor/Unknown citation triplet (v1
        //                  classifier — Wikipedia is Unknown, not ThirdParty).
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
            .ReturnsAsync(TestEnvelope.Of(answer0))
            .ReturnsAsync(TestEnvelope.Of(answer1))
            .ReturnsAsync(TestEnvelope.Of(answer2))
            .ReturnsAsync(TestEnvelope.Of(answer3))
            .ReturnsAsync(TestEnvelope.Of(answer4));

        var pipe = BuildPipeline(ctx, openAi.Object);

        // Per-answer inline extraction (the new pre-Completed flow), then
        // the aggregate job that ScanExecutor enqueues at end-of-scan.
        await RunInlineExtractionAsync(ctx, fx.AnalysisJobId, fx.Answers, pipe);
        await pipe.Aggregate.AggregateAsync(fx.AnalysisJobId, CancellationToken.None);

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
        //    URL-domain classifier returns Owned / Competitor / Unknown only,
        //    so the Wikipedia citation lands in Unknown (the aggregator
        //    surfaces that as UnknownCitationCount on its own rollup).
        var citedSignal = signals.Single(s => s.AIAnswerId == fx.Answers[0].Id);
        citedSignal.OwnedSourceCount.Should().Be(1);
        citedSignal.CompetitorSourceCount.Should().Be(1);

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

        // -- Citation classification through the normalized join. --
        var citations = await ctx.Citations.AsNoTracking()
            .Include(c => c.Source)
            .ToListAsync();
        citations.Should().HaveCount(3);
        var classifications = await ctx.BrandSourceClassifications.AsNoTracking()
            .Where(c => c.BrandId == fx.Brand.Id)
            .ToDictionaryAsync(c => c.SourceId, c => c.SourceType);

        ClassificationFor(citations, classifications, "blog.lumina.io")
            .Should().Be(SourceType.Owned);
        ClassificationFor(citations, classifications, "acme.com")
            .Should().Be(SourceType.Competitor);
        // Phase 4 Slice 0 — Wikipedia URL is Unknown (v1 classifier returns
        // Unknown for "URL present but no match"), not ThirdParty.
        ClassificationFor(citations, classifications, "en.wikipedia.org")
            .Should().Be(SourceType.Unknown);
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
        // Slice-(c)-followup aggregates (Overall + Platform + Lens + Topic):
        //   +1 BrandShareOfVoice (1 brand mention vs 1 competitor mention = 0.5)
        //   +2 BrandSentimentDistribution (Positive ×1, Unknown ×3 — D13
        //      coerced answer #1's Negative to Unknown)
        //   +3 TopCitedSource (3 distinct sources on answer #0)
        //   +1 BrandMentionCount (always emitted, value=1 here)
        //   +1 BrandFirstMentionPosition (1 brand mention → emitted)
        //   +1 BrandSentimentScore (1 brand-mentioned signal → emitted)
        //   +1 BrandFirstMentionRate (≥1 answer with any mention → emitted)
        //   +1 BrandRecommendationScore (1 brand-mentioned signal → emitted)
        //   +1 BrandRecommendationShare (1 brand rec / 1 total rec = 1.0;
        //      Acme's mention is not-recommended so it doesn't contribute)
        //   +1 BrandAbsenceRate (always emits when scope has ≥1 answer;
        //      3/4 absent — answers 1, 2, 3 are not-mentioned and have no
        //      Owned citation in their own answer rows)
        //   +1 AverageAnswerCertainty (always emits when scope has ≥1 answer;
        //      every signal carries the field defaulted to 0.5 here since
        //      the canned JSON omits it)
        //   +1 BrandRiskFlagCount (always emits at non-Competitor scopes;
        //      value 0 here — the canned JSON has no risk_flags entries)
        //   +2 BrandWinningComparisonCount + BrandLosingComparisonCount
        //      (always emit at non-Competitor scopes; values 0 here)
        //   +2 BrandRecommendedForCount + BrandWithCaveatsCount
        //      (always emit at non-Competitor scopes; values 0 here)
        //   +2 BrandTopicRecommendedCount + BrandTopicNotRecommendedCount
        //      (always emit at non-Competitor scopes; values 0 here)
        //   +2 HighAuthorityCitationCount + LowAuthorityCitationCount (always
        //      emit at non-Competitor scopes; Wikipedia is curated at 90 so
        //      high=1, low=0 here)
        // = +23 per non-Competitor scope that has answers; the fixture has
        // 1 Platform group + 1 Lens group + 0 Topic groups so 33 each at
        // Platform and Lens.
        // Overall additionally gets +1 DistinctCoMentionedBrandCount (1
        // competitor co-mentioned with brand in this fixture), so 34.
        //
        // Competitor scope: 5 metrics — MentionCount + RecommendationCount
        // + CoMentionedWithBrandCount (Acme co-mentioned with brand once)
        // + CompetitorShareOfVoice (Acme 1 mention / 2 brand+competitor = 0.5)
        // + CompetitorRecommendationShare (Acme 0 recs / 1 total rec = 0.0).
        metrics.Where(m => m.Scope == ScanMetricScope.Overall).Should().HaveCount(34);
        metrics.Where(m => m.Scope == ScanMetricScope.Platform).Should().HaveCount(33);
        metrics.Where(m => m.Scope == ScanMetricScope.Lens).Should().HaveCount(33);
        metrics.Where(m => m.Scope == ScanMetricScope.Competitor).Should().HaveCount(5);
        metrics.Where(m => m.Scope == ScanMetricScope.Topic).Should().BeEmpty();
        metrics.Should().HaveCount(105);

        // The four classification counts MUST sum to CitationCount — the
        // invariant added in the UnknownCitationCount fix.
        var overallSum =
            metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.OwnedCitationCount).MetricValue +
            metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.CompetitorCitationCount).MetricValue +
            metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.ThirdPartyCitationCount).MetricValue +
            metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.UnknownCitationCount).MetricValue;
        overallSum.Should().Be(metrics.Single(m =>
            m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.CitationCount).MetricValue);

        // Phase 4 Slice 0 bucketing: Owned=1, Competitor=1, ThirdParty=0,
        // Unknown=1 (Wikipedia now lands here instead of ThirdParty).
        metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.OwnedCitationCount)
            .MetricValue.Should().Be(1);
        metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.CompetitorCitationCount)
            .MetricValue.Should().Be(1);
        metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.ThirdPartyCitationCount)
            .MetricValue.Should().Be(0);
        metrics.Single(m => m.Scope == ScanMetricScope.Overall && m.MetricName == MetricNames.UnknownCitationCount)
            .MetricValue.Should().Be(1);

        // BrandMentionRate: 1/4 — answer 0 has BrandMentioned=true; answer 1
        // was coerced false by D13; answers 2 and 3 false.
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

    /// <summary>
    /// Lookup helper: find the Citation whose Source's normalized_domain matches
    /// the expected host, then resolve that Source's BrandSourceClassification.
    /// Mirrors the join the aggregator does internally.
    /// </summary>
    private static SourceType ClassificationFor(
        List<Citation> citations,
        IReadOnlyDictionary<Guid, SourceType> classificationBySourceId,
        string normalizedDomain)
    {
        var citation = citations.Single(c => c.Source.NormalizedDomain == normalizedDomain);
        return classificationBySourceId[citation.SourceId];
    }

    [Fact]
    public async Task FullPipeline_PromotesRuleBasedUnknown_ToLlmClassifiedSourceType_WhenClassifierReturnsVerdict()
    {
        // Phase 4 v1 Slice 1: rule-based-Unknown sources get re-classified
        // by the LLM at persistence time (Phase 4 plan D1/D5). Rule-based
        // Owned/Competitor verdicts are kept — classifier is never called
        // for them.
        using var ctx = NewContext();
        var fx = SeedFixture(ctx, answerCount: 1);

        // Single answer with three citations:
        //   1. blog.lumina.io   -> URL matcher classifies Owned       (skip LLM)
        //   2. acme.com         -> URL matcher classifies Competitor  (skip LLM)
        //   3. en.wikipedia.org -> URL matcher returns Unknown        (LLM runs, returns Reference)
        const string answer = """
            {
              "answer_signal": {
                "brand_mentioned": true, "brand_recommended": true,
                "brand_rank": 1, "brand_sentiment": "Positive",
                "brand_recommendation_strength": "Strong",
                "answer_has_ranking": false, "answer_has_comparison": false,
                "answer_has_citations": true, "confidence_score": 0.9
              },
              "mentions": [],
              "citations": [
                { "source_name": "Lumina blog", "url": "https://blog.lumina.io/x", "confidence_score": 0.9 },
                { "source_name": "Acme",        "url": "https://acme.com/y",       "confidence_score": 0.8 },
                { "source_name": "Wikipedia",   "url": "https://en.wikipedia.org/z","confidence_score": 0.7 }
              ]
            }
            """;
        var openAi = new Mock<IOpenAiService>();
        openAi.Setup(s => s.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(answer));

        var classifier = new Mock<ISourceClassifier>();
        // Verdict: any rule-based-Unknown source we see is "Reference".
        classifier.Setup(c => c.ClassifyAsync(
                It.IsAny<SourceClassificationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SourceClassificationVerdict(SourceType.Reference, 0.95, "Wikipedia is reference."));

        var pipe = BuildPipeline(ctx, openAi.Object, classifier.Object);
        await RunInlineExtractionAsync(ctx, fx.AnalysisJobId, fx.Answers, pipe);

        var classifications = await ctx.BrandSourceClassifications.AsNoTracking()
            .Where(c => c.BrandId == fx.Brand.Id)
            .ToListAsync();
        var sources = await ctx.Sources.AsNoTracking().ToDictionaryAsync(s => s.Id, s => s);

        // Three classifications — one per Source row created.
        classifications.Should().HaveCount(3);

        // Owned: blog.lumina.io stays RuleBased + Owned + Active. Classifier MUST NOT be called.
        var ownedRow = classifications.Single(c => sources[c.SourceId].NormalizedDomain == "blog.lumina.io");
        ownedRow.SourceType.Should().Be(SourceType.Owned);
        ownedRow.ProvenanceSource.Should().Be(ClassificationSource.RuleBased);
        ownedRow.Status.Should().Be(ClassificationStatus.Active);

        // Competitor: acme.com stays RuleBased + Competitor.
        var competitorRow = classifications.Single(c => sources[c.SourceId].NormalizedDomain == "acme.com");
        competitorRow.SourceType.Should().Be(SourceType.Competitor);
        competitorRow.ProvenanceSource.Should().Be(ClassificationSource.RuleBased);

        // Wikipedia: was RuleBased+Unknown, promoted to LLMClassified+Reference+Active.
        var wikipediaRow = classifications.Single(c => sources[c.SourceId].NormalizedDomain == "en.wikipedia.org");
        wikipediaRow.SourceType.Should().Be(SourceType.Reference);
        wikipediaRow.ProvenanceSource.Should().Be(ClassificationSource.LLMClassified);
        wikipediaRow.Status.Should().Be(ClassificationStatus.Active);
        wikipediaRow.ConfidenceScore.Should().BeApproximately(0.95, 1e-9);

        // Classifier was called once and only for the rule-based-Unknown source.
        // D5: skip-when-decisive — Owned + Competitor verdicts MUST NOT trigger an LLM call.
        classifier.Verify(c => c.ClassifyAsync(
            It.Is<SourceClassificationRequest>(r => r.NormalizedDomain == "en.wikipedia.org"),
            It.IsAny<CancellationToken>()),
            Times.Once);
        classifier.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task FullPipeline_LeavesRowAtRuleBasedUnknown_WhenClassifierReturnsNull()
    {
        // D4: classifier failure must not stop the rest of the scan persisting.
        // The row stays at RuleBased/Unknown; the job logs and continues.
        using var ctx = NewContext();
        var fx = SeedFixture(ctx, answerCount: 1);

        const string answer = """
            {
              "answer_signal": {
                "brand_mentioned": false, "brand_recommended": false,
                "brand_rank": null, "brand_sentiment": "Unknown",
                "brand_recommendation_strength": "Unknown",
                "answer_has_ranking": false, "answer_has_comparison": false,
                "answer_has_citations": true, "confidence_score": 0.5
              },
              "mentions": [],
              "citations": [
                { "source_name": "Trustpilot", "url": null, "confidence_score": 0.6 }
              ]
            }
            """;
        var openAi = new Mock<IOpenAiService>();
        openAi.Setup(s => s.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(answer));

        var classifier = new Mock<ISourceClassifier>();
        classifier.Setup(c => c.ClassifyAsync(
                It.IsAny<SourceClassificationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SourceClassificationVerdict?)null);

        var pipe = BuildPipeline(ctx, openAi.Object, classifier.Object);
        await RunInlineExtractionAsync(ctx, fx.AnalysisJobId, fx.Answers, pipe);

        var classification = await ctx.BrandSourceClassifications.AsNoTracking()
            .SingleAsync(c => c.BrandId == fx.Brand.Id);
        classification.SourceType.Should().Be(SourceType.Unknown);
        classification.ProvenanceSource.Should().Be(ClassificationSource.RuleBased);
        classification.Status.Should().Be(ClassificationStatus.Unknown);

        // Job still completed — failure was isolated to the one classification row.
        var job = await ctx.AnalysisJobs.AsNoTracking().FirstAsync(j => j.Id == fx.AnalysisJobId);
        job.ErrorMessage.Should().BeNull();
        job.ExtractCompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task FullPipeline_LeavesRowAtRuleBasedUnknown_WhenClassifierThrows()
    {
        // D4: defense-in-depth — if the classifier throws (e.g. OpenAI 500
        // not handled by the impl), the job catches per-source and continues.
        using var ctx = NewContext();
        var fx = SeedFixture(ctx, answerCount: 1);

        const string answer = """
            {
              "answer_signal": {
                "brand_mentioned": false, "brand_recommended": false,
                "brand_rank": null, "brand_sentiment": "Unknown",
                "brand_recommendation_strength": "Unknown",
                "answer_has_ranking": false, "answer_has_comparison": false,
                "answer_has_citations": true, "confidence_score": 0.5
              },
              "mentions": [],
              "citations": [
                { "source_name": "Some Source", "url": "https://random-unknown.example.com/x", "confidence_score": 0.5 }
              ]
            }
            """;
        var openAi = new Mock<IOpenAiService>();
        openAi.Setup(s => s.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(answer));

        var classifier = new Mock<ISourceClassifier>();
        classifier.Setup(c => c.ClassifyAsync(
                It.IsAny<SourceClassificationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("simulated upstream failure"));

        var pipe = BuildPipeline(ctx, openAi.Object, classifier.Object);
        await RunInlineExtractionAsync(ctx, fx.AnalysisJobId, fx.Answers, pipe);

        var classification = await ctx.BrandSourceClassifications.AsNoTracking()
            .SingleAsync(c => c.BrandId == fx.Brand.Id);
        classification.ProvenanceSource.Should().Be(ClassificationSource.RuleBased);

        var job = await ctx.AnalysisJobs.AsNoTracking().FirstAsync(j => j.Id == fx.AnalysisJobId);
        job.ErrorMessage.Should().BeNull(); // per-source catch absorbed the throw
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
        var pipe = BuildPipeline(ctx, openAi.Object);

        await RunInlineExtractionAsync(ctx, fx.AnalysisJobId, fx.Answers, pipe);
        await pipe.Aggregate.AggregateAsync(fx.AnalysisJobId, CancellationToken.None);

        var job = await ctx.AnalysisJobs.AsNoTracking().FirstAsync(j => j.Id == fx.AnalysisJobId);
        job.Status.Should().Be(AnalysisJobStatus.Completed);
        (await ctx.AnswerSignals.CountAsync()).Should().Be(0);

        openAi.Verify(
            s => s.ChatCompletionAsync(It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
