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
/// Slice 1 skeleton tests: only verify the status/timestamp transitions.
/// Real extraction (Slice 2) and aggregation (Slice 4) tests will exercise
/// actual data work later.
/// </summary>
public class AnalysisJobSkeletonTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Guid SeedQueuedJob(AppDbContext ctx)
    {
        // Need a parent ScanRun for the FK; minimal seeding only.
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = Guid.NewGuid(),
            TriggerType = ScanTriggerType.Manual,
            Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        };
        var job = new AnalysisJob
        {
            Id = Guid.NewGuid(),
            ScanRunId = scan.Id,
            Status = AnalysisJobStatus.Queued,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.ScanRuns.Add(scan);
        ctx.AnalysisJobs.Add(job);
        ctx.SaveChanges();
        return job.Id;
    }

    // -- SignalExtractionJob --

    [Fact]
    public async Task SignalExtraction_TransitionsToRunning_ThenStampsExtractCompletedAt()
    {
        using var ctx = NewContext();
        var jobId = SeedQueuedJob(ctx);
        var sut = new SignalExtractionJob(ctx, new Mock<ILogger<SignalExtractionJob>>().Object);

        await sut.ExtractAsync(jobId, CancellationToken.None);

        var job = await ctx.AnalysisJobs.FindAsync(jobId);
        job!.Status.Should().Be(AnalysisJobStatus.Running); // aggregate hasn't run yet
        job.ExtractStartedAt.Should().NotBeNull().And.BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        job.ExtractCompletedAt.Should().NotBeNull().And.BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        job.AggregateStartedAt.Should().BeNull();
    }

    [Fact]
    public async Task SignalExtraction_Throws_WhenJobMissing()
    {
        using var ctx = NewContext();
        var sut = new SignalExtractionJob(ctx, new Mock<ILogger<SignalExtractionJob>>().Object);

        var act = () => sut.ExtractAsync(Guid.NewGuid(), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task SignalExtraction_IsIdempotent_OnRetry_OverwritesExtractStartedAt()
    {
        // Simulates Hangfire retry: a previous attempt already ran. The retry should
        // reset ExtractStartedAt and re-set the status to Running.
        using var ctx = NewContext();
        var jobId = SeedQueuedJob(ctx);
        var job = await ctx.AnalysisJobs.FindAsync(jobId);
        job!.Status = AnalysisJobStatus.Running;
        job.ExtractStartedAt = DateTime.UtcNow.AddHours(-1); // stale from prior attempt
        await ctx.SaveChangesAsync();

        var sut = new SignalExtractionJob(ctx, new Mock<ILogger<SignalExtractionJob>>().Object);
        await sut.ExtractAsync(jobId, CancellationToken.None);

        var reloaded = await ctx.AnalysisJobs.FindAsync(jobId);
        reloaded!.ExtractStartedAt.Should().BeAfter(DateTime.UtcNow.AddMinutes(-1)); // refreshed
    }

    // -- MetricAggregationJob --

    [Fact]
    public async Task Aggregate_StampsAggregateTimestamps_AndCompletesJob()
    {
        using var ctx = NewContext();
        var jobId = SeedQueuedJob(ctx);
        // Set the state aggregate would see in the real pipeline: extract done.
        var job = await ctx.AnalysisJobs.FindAsync(jobId);
        job!.Status = AnalysisJobStatus.Running;
        job.ExtractStartedAt = DateTime.UtcNow.AddMinutes(-3);
        job.ExtractCompletedAt = DateTime.UtcNow.AddMinutes(-1);
        await ctx.SaveChangesAsync();

        var sut = new MetricAggregationJob(ctx, new Mock<ILogger<MetricAggregationJob>>().Object);
        await sut.AggregateAsync(jobId, CancellationToken.None);

        var reloaded = await ctx.AnalysisJobs.FindAsync(jobId);
        reloaded!.Status.Should().Be(AnalysisJobStatus.Completed);
        reloaded.AggregateStartedAt.Should().NotBeNull();
        reloaded.AggregateCompletedAt.Should().NotBeNull();
        reloaded.AggregateCompletedAt.Should().BeOnOrAfter(reloaded.AggregateStartedAt!.Value);
        // Extract timestamps preserved.
        reloaded.ExtractCompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Aggregate_Throws_WhenJobMissing()
    {
        using var ctx = NewContext();
        var sut = new MetricAggregationJob(ctx, new Mock<ILogger<MetricAggregationJob>>().Object);

        var act = () => sut.AggregateAsync(Guid.NewGuid(), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
