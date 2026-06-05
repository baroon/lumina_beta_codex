using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using AIVisibility.Infrastructure.Data;
using AIVisibility.Infrastructure.Scanning;
using AIVisibility.Tests.TestHelpers;
using FluentAssertions;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

public class ScanExecutorTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static (Guid RunId, Guid PromptRunId, Guid BrandId) Seed(AppDbContext ctx)
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
            Name = "T",
            PromptAllocation = 30,
            Cadence = Cadence.Daily,
            Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var prompt = new Prompt
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            PromptText = "What is best?",
            LensId = Guid.NewGuid(),
            Status = PromptStatus.Active,
            Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "ChatGpt", Name = "ChatGPT", DisplayOrder = 1 };
        var run = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            TriggerType = ScanTriggerType.Manual,
            Status = ScanRunStatus.Pending,
            PromptCount = 1,
            PlatformCount = 1,
            ScanCheckCount = 1,
            StartedAt = DateTime.UtcNow,
        };
        var pr = new PromptRun
        {
            Id = Guid.NewGuid(),
            ScanRunId = run.Id,
            PromptId = prompt.Id,
            AIPlatformId = platform.Id,
            Status = PromptRunStatus.Pending,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.Prompts.Add(prompt);
        ctx.AIPlatforms.Add(platform);
        ctx.ScanRuns.Add(run);
        ctx.PromptRuns.Add(pr);
        ctx.SaveChanges();
        return (run.Id, pr.Id, brand.Id);
    }

    private static Mock<IBackgroundJobClient> NewJobs()
    {
        var jobs = new Mock<IBackgroundJobClient>();
        jobs.Setup(j => j.Create(It.IsAny<Job>(), It.IsAny<IState>()))
            .Returns("stub-job-id");
        return jobs;
    }

    private static SignalExtractor StubExtractor()
    {
        var openAi = new Mock<IOpenAiService>();
        // No envelope returned -> SignalExtractor returns null per-answer, so
        // the inline write step is skipped. Tests that care about the inline
        // write either inject a real envelope (and assert against the writer)
        // or use the writer mock directly.
        openAi
            .Setup(s => s.ChatCompletionAsync(It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(string.Empty));
        return new SignalExtractor(openAi.Object, new Mock<ILogger<SignalExtractor>>().Object);
    }

    private static ISignalExtractionContextFactory StubContextFactory(Guid brandId)
    {
        var factory = new Mock<ISignalExtractionContextFactory>();
        factory
            .Setup(f => f.BuildAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SignalExtractionContext(
                new Brand { Id = brandId, Name = "Acme" },
                Array.Empty<Competitor>(),
                Array.Empty<Product>()));
        return factory.Object;
    }

    private static ScanExecutor Executor(
        AppDbContext ctx,
        IScanProvider provider,
        IBackgroundJobClient? jobs = null,
        IAnswerSignalWriter? writer = null,
        SignalExtractor? extractor = null,
        ISignalExtractionContextFactory? contextFactory = null,
        Guid? brandId = null) =>
        new(
            ctx,
            provider,
            jobs ?? NewJobs().Object,
            extractor ?? StubExtractor(),
            writer ?? Mock.Of<IAnswerSignalWriter>(),
            contextFactory ?? StubContextFactory(brandId ?? Guid.NewGuid()),
            new Mock<ILogger<ScanExecutor>>().Object);

    [Fact]
    public async Task Execute_StoresAnswer_AndCompletes()
    {
        using var ctx = NewContext();
        var (runId, prId, brandId) = Seed(ctx);
        var provider = new Mock<IScanProvider>();
        provider
            .Setup(p => p.GetAnswerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(true, "Acme is best.", null, "raw"));

        await Executor(ctx, provider.Object, brandId: brandId).ExecuteAsync(runId, CancellationToken.None);

        var run = await ctx.ScanRuns.FindAsync(runId);
        run!.Status.Should().Be(ScanRunStatus.Completed);
        run.CompletedCount.Should().Be(1);
        run.FailedCount.Should().Be(0);
        (await ctx.PromptRuns.FindAsync(prId))!.Status.Should().Be(PromptRunStatus.Completed);
        (await ctx.AIAnswers.SingleAsync(a => a.PromptRunId == prId)).AnswerText.Should().Be("Acme is best.");
    }

    [Fact]
    public async Task Execute_MarksFailed_WhenProviderFails()
    {
        using var ctx = NewContext();
        var (runId, prId, brandId) = Seed(ctx);
        var provider = new Mock<IScanProvider>();
        provider
            .Setup(p => p.GetAnswerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(false, string.Empty, "not configured"));

        await Executor(ctx, provider.Object, brandId: brandId).ExecuteAsync(runId, CancellationToken.None);

        var run = await ctx.ScanRuns.FindAsync(runId);
        run!.FailedCount.Should().Be(1);
        run.Status.Should().Be(ScanRunStatus.Completed);
        (await ctx.PromptRuns.FindAsync(prId))!.Status.Should().Be(PromptRunStatus.Failed);
        (await ctx.AIAnswers.AnyAsync(a => a.PromptRunId == prId)).Should().BeFalse();
    }

    [Fact]
    public async Task Execute_RunsExtractionInline_AfterEachAnswer()
    {
        using var ctx = NewContext();
        var (runId, _, brandId) = Seed(ctx);
        var provider = new Mock<IScanProvider>();
        provider
            .Setup(p => p.GetAnswerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(true, "answer", null, "raw"));

        // Real extractor returning a minimal signal so the inline writer call
        // receives a non-null result.
        var openAi = new Mock<IOpenAiService>();
        openAi
            .Setup(s => s.ChatCompletionAsync(It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(MinimalEnvelope));
        var extractor = new SignalExtractor(openAi.Object, new Mock<ILogger<SignalExtractor>>().Object);

        var writer = new Mock<IAnswerSignalWriter>();
        writer
            .Setup(w => w.WriteAsync(
                It.IsAny<SignalExtractionResult>(),
                It.IsAny<SignalExtractionContext>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        await Executor(
            ctx, provider.Object,
            writer: writer.Object,
            extractor: extractor,
            brandId: brandId).ExecuteAsync(runId, CancellationToken.None);

        writer.Verify(w => w.WriteAsync(
            It.IsAny<SignalExtractionResult>(),
            It.IsAny<SignalExtractionContext>(),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Execute_PerAnswerExtractionFailure_DoesNotFailTheScan()
    {
        using var ctx = NewContext();
        var (runId, prId, brandId) = Seed(ctx);
        var provider = new Mock<IScanProvider>();
        provider
            .Setup(p => p.GetAnswerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(true, "answer", null, "raw"));

        var openAi = new Mock<IOpenAiService>();
        openAi
            .Setup(s => s.ChatCompletionAsync(It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(MinimalEnvelope));
        var extractor = new SignalExtractor(openAi.Object, new Mock<ILogger<SignalExtractor>>().Object);

        var writer = new Mock<IAnswerSignalWriter>();
        writer
            .Setup(w => w.WriteAsync(
                It.IsAny<SignalExtractionResult>(),
                It.IsAny<SignalExtractionContext>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("simulated writer failure"));

        await Executor(
            ctx, provider.Object,
            writer: writer.Object,
            extractor: extractor,
            brandId: brandId).ExecuteAsync(runId, CancellationToken.None);

        // PromptRun + ScanRun still complete despite the extraction failure.
        var run = await ctx.ScanRuns.FindAsync(runId);
        run!.Status.Should().Be(ScanRunStatus.Completed);
        (await ctx.PromptRuns.FindAsync(prId))!.Status.Should().Be(PromptRunStatus.Completed);
    }

    [Fact]
    public async Task Execute_CreatesAnalysisJob_AndEnqueuesMetricAggregationDirectly()
    {
        using var ctx = NewContext();
        var (runId, _, brandId) = Seed(ctx);
        var provider = new Mock<IScanProvider>();
        provider
            .Setup(p => p.GetAnswerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(true, "answer", null, "raw"));
        var jobs = NewJobs();

        await Executor(ctx, provider.Object, jobs.Object, brandId: brandId)
            .ExecuteAsync(runId, CancellationToken.None);

        // AnalysisJob row exists with extraction already stamped — inline
        // extraction means the row lands with ExtractStartedAt and
        // ExtractCompletedAt populated, status Running awaiting aggregation.
        var analysisJob = await ctx.AnalysisJobs.SingleAsync(j => j.ScanRunId == runId);
        analysisJob.Status.Should().Be(AnalysisJobStatus.Running);
        analysisJob.ExtractStartedAt.Should().NotBeNull();
        analysisJob.ExtractCompletedAt.Should().NotBeNull();
        analysisJob.AggregateCompletedAt.Should().BeNull();

        // MetricAggregationJob is enqueued directly (no SignalExtractionJob
        // continuation in the new flow).
        jobs.Verify(j => j.Create(
                It.Is<Job>(job =>
                    job.Type == typeof(IMetricAggregationJob)
                    && job.Method.Name == nameof(IMetricAggregationJob.AggregateAsync)
                    && (Guid)job.Args[0] == analysisJob.Id),
                It.IsAny<EnqueuedState>()),
            Times.Once);
    }

    private const string MinimalEnvelope = """
        {
          "answer_signal": {
            "brand_mentioned": true, "brand_recommended": true,
            "brand_rank": 1, "brand_sentiment": "Positive",
            "brand_recommendation_strength": "Strong",
            "top_recommended_entity": "Acme",
            "answer_has_ranking": true, "answer_has_comparison": false,
            "answer_has_citations": false, "confidence_score": 0.9
          },
          "mentions": [
            { "entity_type": "Brand", "name": "Acme", "is_recommended": true,
              "recommendation_strength": "Strong", "sentiment": "Positive",
              "evidence_snippet": "Acme is top.", "confidence_score": 0.95 }
          ],
          "citations": []
        }
        """;
}
