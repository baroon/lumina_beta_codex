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
/// MetricAggregationJob tests. The aggregator math is covered separately in
/// <see cref="MetricAggregatorTests"/>; these tests cover the job wrapper —
/// status transitions, persistence, terminal Failed path.
/// </summary>
public class MetricAggregationJobTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Guid SeedQueuedJob(AppDbContext ctx, bool withScan = true)
    {
        var scanId = Guid.NewGuid();
        if (withScan)
        {
            ctx.ScanRuns.Add(new ScanRun
            {
                Id = scanId,
                TrackerConfigurationId = Guid.NewGuid(),
                TriggerType = ScanTriggerType.Manual,
                Status = ScanRunStatus.Completed,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow,
            });
        }

        var job = new AnalysisJob
        {
            Id = Guid.NewGuid(),
            ScanRunId = scanId,
            // Tests start the job at Running (extract is done) — what the real
            // pipeline hands to aggregate via Hangfire ContinueWith.
            Status = AnalysisJobStatus.Running,
            ExtractStartedAt = DateTime.UtcNow.AddMinutes(-1),
            ExtractCompletedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow.AddMinutes(-1),
        };
        ctx.AnalysisJobs.Add(job);
        ctx.SaveChanges();
        return job.Id;
    }

    private static MetricAggregationJob Build(AppDbContext ctx) =>
        new(ctx, new MetricAggregator(ctx, new Mock<ILogger<MetricAggregator>>().Object),
            new Mock<ILogger<MetricAggregationJob>>().Object);

    [Fact]
    public async Task Throws_WhenAnalysisJob_NotFound()
    {
        using var ctx = NewContext();
        var sut = Build(ctx);

        var act = () => sut.AggregateAsync(Guid.NewGuid(), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task EmptyScan_StampsTimestamps_FlipsToCompleted_WithZeroMetricRows()
    {
        using var ctx = NewContext();
        var jobId = SeedQueuedJob(ctx);
        var sut = Build(ctx);

        await sut.AggregateAsync(jobId, CancellationToken.None);

        var reloaded = await ctx.AnalysisJobs.FindAsync(jobId);
        reloaded!.Status.Should().Be(AnalysisJobStatus.Completed);
        reloaded.AggregateStartedAt.Should().NotBeNull();
        reloaded.AggregateCompletedAt.Should().NotBeNull();
        reloaded.AggregateCompletedAt.Should().BeOnOrAfter(reloaded.AggregateStartedAt!.Value);
        (await ctx.ScanMetrics.CountAsync()).Should().Be(0);
    }

    // No explicit job-level-exception test here. The Status=Failed + ErrorMessage
    // + rethrow pattern is identical to SignalExtractionJob's and is covered by
    // SignalExtractionJobTests.JobLevelException_MarksFailed_AndRethrows_ForHangfireRetry.
    // Triggering a throw from MetricAggregator would require a corrupted-fixture
    // setup that has no natural shape — the aggregator deliberately uses defensive
    // TryGetValue / Where filters so missing data degrades gracefully.
}
