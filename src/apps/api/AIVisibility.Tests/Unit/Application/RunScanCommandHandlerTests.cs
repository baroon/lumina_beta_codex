using AIVisibility.Application.Commands.Scans;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AIVisibility.Tests.Unit.Application;

public class RunScanCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static TrackerConfiguration Seed(
        AppDbContext ctx,
        Cadence cadence = Cadence.Daily,
        int activePrompts = 2,
        int platforms = 2,
        DateTime? lastRunAt = null)
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
            Name = "Tracker",
            PromptAllocation = 30,
            Cadence = cadence,
            Status = TrackerStatus.Active,
            LastRunAt = lastRunAt,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        for (var i = 0; i < activePrompts; i++)
        {
            ctx.Prompts.Add(new Prompt
            {
                Id = Guid.NewGuid(),
                TrackerConfigurationId = tracker.Id,
                PromptText = $"Q{i}",
                LensId = Guid.NewGuid(),
                Status = PromptStatus.Active,
                Source = PromptSource.Generated,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        for (var i = 0; i < platforms; i++)
        {
            var p = new AIPlatform { Id = Guid.NewGuid(), Code = $"P{i}", Name = $"P{i}", DisplayOrder = i };
            ctx.AIPlatforms.Add(p);
            ctx.TrackerPlatforms.Add(new TrackerPlatform
            {
                TrackerConfigurationId = tracker.Id,
                AIPlatformId = p.Id,
            });
        }
        ctx.SaveChanges();
        return tracker;
    }

    private static Mock<IBackgroundJobClient> NewJobs()
    {
        var jobs = new Mock<IBackgroundJobClient>();
        // Hangfire's Enqueue<T>(...) extension internally calls Create(Job, IState).
        // Stub the Create return so the extension's plumbing has a job id to return.
        jobs.Setup(j => j.Create(It.IsAny<Job>(), It.IsAny<IState>()))
            .Returns("stub-job-id");
        return jobs;
    }

    [Fact]
    public async Task Run_CreatesRun_FansOut_AndEnqueuesScanExecutorViaHangfire()
    {
        using var ctx = NewContext();
        var tracker = Seed(ctx);
        var jobs = NewJobs();

        var result = await new RunScanCommandHandler(ctx, jobs.Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        result.ScanCheckCount.Should().Be(4); // 2 prompts × 2 platforms
        (await ctx.ScanRuns.CountAsync()).Should().Be(1);
        (await ctx.PromptRuns.CountAsync()).Should().Be(4);
        (await ctx.PromptRuns.AllAsync(p => p.Status == PromptRunStatus.Pending)).Should().BeTrue();
        (await ctx.TrackerConfigurations.FindAsync(tracker.Id))!.LastRunAt.Should().NotBeNull();

        // Verify Hangfire received an IScanExecutor.ExecuteAsync job with this scan run id
        // and was enqueued (EnqueuedState, not a delayed/scheduled state).
        jobs.Verify(j => j.Create(
                It.Is<Job>(job =>
                    job.Type == typeof(IScanExecutor)
                    && job.Method.Name == nameof(IScanExecutor.ExecuteAsync)
                    && (Guid)job.Args[0] == result.ScanRunId),
                It.IsAny<EnqueuedState>()),
            Times.Once);
    }

    [Fact]
    public async Task Run_Throws_WhenNoActivePrompts()
    {
        using var ctx = NewContext();
        var tracker = Seed(ctx, activePrompts: 0);

        var act = () => new RunScanCommandHandler(ctx, NewJobs().Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Run_OnDemand_Throws_BusinessRule_WhenRunWithin24h()
    {
        using var ctx = NewContext();
        var tracker = Seed(ctx, cadence: Cadence.OnDemand, lastRunAt: DateTime.UtcNow.AddHours(-2));

        var act = () => new RunScanCommandHandler(ctx, NewJobs().Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        // Distinct from InvalidOperationException (which the API filter maps
        // to 404) — cooldown is a 409 Conflict, signalled by the type.
        await act.Should().ThrowAsync<AIVisibility.Application.Exceptions.BusinessRuleException>()
            .WithMessage("*24 hours*");
    }

    [Fact]
    public async Task Run_OnDemand_Allows_WhenOver24h()
    {
        using var ctx = NewContext();
        var tracker = Seed(ctx, cadence: Cadence.OnDemand, lastRunAt: DateTime.UtcNow.AddHours(-25));

        var result = await new RunScanCommandHandler(ctx, NewJobs().Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        result.ScanCheckCount.Should().Be(4);
    }

    [Fact]
    public async Task Run_DoesNotEnqueue_WhenValidationFails()
    {
        // If validation throws after we've already begun creating the run, we should
        // not enqueue a Hangfire job for a scan that doesn't exist. Validation throws
        // before any enqueue attempt — this test locks that ordering in.
        using var ctx = NewContext();
        var tracker = Seed(ctx, activePrompts: 0);
        var jobs = NewJobs();

        var act = () => new RunScanCommandHandler(ctx, jobs.Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
        jobs.Verify(j => j.Create(It.IsAny<Job>(), It.IsAny<IState>()), Times.Never);
    }
}
