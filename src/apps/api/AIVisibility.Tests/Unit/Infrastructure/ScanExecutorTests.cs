using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using AIVisibility.Infrastructure.Scanning;
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

    private static (Guid RunId, Guid PromptRunId) Seed(AppDbContext ctx)
    {
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(),
            BrandId = Guid.NewGuid(),
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
        ctx.TrackerConfigurations.Add(tracker);
        ctx.Prompts.Add(prompt);
        ctx.AIPlatforms.Add(platform);
        ctx.ScanRuns.Add(run);
        ctx.PromptRuns.Add(pr);
        ctx.SaveChanges();
        return (run.Id, pr.Id);
    }

    private static Mock<IBackgroundJobClient> NewJobs()
    {
        var jobs = new Mock<IBackgroundJobClient>();
        // Hangfire's Enqueue<T> / ContinueJobWith<T> extensions internally call Create(Job, IState).
        // Stub the return so the extensions have a job id to return for chaining.
        jobs.Setup(j => j.Create(It.IsAny<Job>(), It.IsAny<IState>()))
            .Returns("stub-job-id");
        return jobs;
    }

    private static ScanExecutor Executor(AppDbContext ctx, IScanProvider provider, IBackgroundJobClient? jobs = null) =>
        new(ctx, provider, jobs ?? NewJobs().Object, new Mock<ILogger<ScanExecutor>>().Object);

    [Fact]
    public async Task Execute_StoresAnswer_AndCompletes()
    {
        using var ctx = NewContext();
        var (runId, prId) = Seed(ctx);
        var provider = new Mock<IScanProvider>();
        provider
            .Setup(p => p.GetAnswerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(true, "Acme is best.", null, "raw"));

        await Executor(ctx, provider.Object).ExecuteAsync(runId, CancellationToken.None);

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
        var (runId, prId) = Seed(ctx);
        var provider = new Mock<IScanProvider>();
        provider
            .Setup(p => p.GetAnswerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(false, string.Empty, "not configured"));

        await Executor(ctx, provider.Object).ExecuteAsync(runId, CancellationToken.None);

        var run = await ctx.ScanRuns.FindAsync(runId);
        run!.FailedCount.Should().Be(1);
        run.Status.Should().Be(ScanRunStatus.Completed);
        (await ctx.PromptRuns.FindAsync(prId))!.Status.Should().Be(PromptRunStatus.Failed);
        (await ctx.AIAnswers.AnyAsync(a => a.PromptRunId == prId)).Should().BeFalse();
    }

    [Fact]
    public async Task Execute_CreatesAnalysisJob_AndEnqueuesExtractWithAggregateContinuation()
    {
        using var ctx = NewContext();
        var (runId, _) = Seed(ctx);
        var provider = new Mock<IScanProvider>();
        provider
            .Setup(p => p.GetAnswerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(true, "answer", null, "raw"));
        var jobs = NewJobs();

        await Executor(ctx, provider.Object, jobs.Object).ExecuteAsync(runId, CancellationToken.None);

        // AnalysisJob row exists, references the right ScanRun, starts in Queued status.
        var analysisJob = await ctx.AnalysisJobs.SingleAsync(j => j.ScanRunId == runId);
        analysisJob.Status.Should().Be(AnalysisJobStatus.Queued);
        analysisJob.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        analysisJob.ExtractStartedAt.Should().BeNull();   // jobs haven't run yet
        analysisJob.AggregateCompletedAt.Should().BeNull();

        // Hangfire received an ISignalExtractionJob.ExtractAsync(analysisJobId) enqueued normally.
        jobs.Verify(j => j.Create(
                It.Is<Job>(job =>
                    job.Type == typeof(ISignalExtractionJob)
                    && job.Method.Name == nameof(ISignalExtractionJob.ExtractAsync)
                    && (Guid)job.Args[0] == analysisJob.Id),
                It.IsAny<EnqueuedState>()),
            Times.Once);

        // And an IMetricAggregationJob.AggregateAsync chained via continuation (AwaitingState).
        jobs.Verify(j => j.Create(
                It.Is<Job>(job =>
                    job.Type == typeof(IMetricAggregationJob)
                    && job.Method.Name == nameof(IMetricAggregationJob.AggregateAsync)
                    && (Guid)job.Args[0] == analysisJob.Id),
                It.IsAny<AwaitingState>()),
            Times.Once);
    }
}
