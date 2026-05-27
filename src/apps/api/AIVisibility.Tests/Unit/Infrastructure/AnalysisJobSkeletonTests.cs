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
/// MetricAggregationJob is still skeleton in Slice 2 (real work lands in
/// Slice 4 — D2). These tests just verify the status/timestamp transitions.
/// SignalExtractionJob is covered separately in <see cref="SignalExtractionJobTests"/>
/// now that it does real LLM-driven extraction.
/// </summary>
public class AnalysisJobSkeletonTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Guid SeedQueuedJob(AppDbContext ctx)
    {
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

    [Fact]
    public async Task Aggregate_StampsAggregateTimestamps_AndCompletesJob()
    {
        using var ctx = NewContext();
        var jobId = SeedQueuedJob(ctx);
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
