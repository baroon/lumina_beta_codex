using AIVisibility.Application.Queries.Scans;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class GetAllScansQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record SeedResult(Guid BrandId, Guid TrackerId);

    private static SeedResult SeedTracker(AppDbContext ctx, string brandName, string trackerName)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = brandName,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = trackerName, Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        return new SeedResult(brand.Id, tracker.Id);
    }

    private static Guid SeedScan(AppDbContext ctx, Guid trackerId, DateTime startedAt,
        ScanRunStatus status = ScanRunStatus.Completed, AnalysisJobStatus? analysis = AnalysisJobStatus.Completed)
    {
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = trackerId,
            TriggerType = ScanTriggerType.Manual,
            Status = status,
            ScanCheckCount = 5, CompletedCount = 5, FailedCount = 0,
            StartedAt = startedAt, CompletedAt = startedAt.AddMinutes(2),
        };
        ctx.ScanRuns.Add(scan);
        if (analysis.HasValue)
        {
            ctx.AnalysisJobs.Add(new AnalysisJob
            {
                Id = Guid.NewGuid(), ScanRunId = scan.Id,
                Status = analysis.Value, CreatedAt = startedAt,
            });
        }
        return scan.Id;
    }

    [Fact]
    public async Task ReturnsEmpty_WhenNoScans()
    {
        using var ctx = NewContext();
        var result = await new GetAllScansQueryHandler(ctx)
            .Handle(new GetAllScansQuery(), CancellationToken.None);
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ReturnsScansOrderedByStartedAtDescending_AcrossTrackers()
    {
        using var ctx = NewContext();
        var a = SeedTracker(ctx, "BrandA", "TrackerA");
        var b = SeedTracker(ctx, "BrandB", "TrackerB");
        var older = SeedScan(ctx, a.TrackerId, DateTime.UtcNow.AddHours(-2));
        var newer = SeedScan(ctx, b.TrackerId, DateTime.UtcNow.AddMinutes(-5));
        var middle = SeedScan(ctx, a.TrackerId, DateTime.UtcNow.AddHours(-1));
        await ctx.SaveChangesAsync();

        var result = await new GetAllScansQueryHandler(ctx)
            .Handle(new GetAllScansQuery(), CancellationToken.None);

        result.Should().HaveCount(3);
        result.Select(s => s.ScanRunId).Should().ContainInOrder(newer, middle, older);
        result[0].BrandName.Should().Be("BrandB");
        result[0].TrackerName.Should().Be("TrackerB");
    }

    [Fact]
    public async Task SurfacesScansWithNoAnalysisJob_WithNullAnalysisStatus()
    {
        // Pre-Slice-1 scans + scans currently mid-extract (between Scan
        // Completed and AnalysisJob row insert) have no analysis_job row.
        // They should still appear in the list with AnalysisStatus = null.
        using var ctx = NewContext();
        var t = SeedTracker(ctx, "B", "T");
        SeedScan(ctx, t.TrackerId, DateTime.UtcNow, analysis: null);
        await ctx.SaveChangesAsync();

        var result = await new GetAllScansQueryHandler(ctx)
            .Handle(new GetAllScansQuery(), CancellationToken.None);

        result.Should().ContainSingle();
        result[0].AnalysisStatus.Should().BeNull();
        result[0].ScanStatus.Should().Be("Completed");
    }
}
