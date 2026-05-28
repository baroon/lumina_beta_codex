using AIVisibility.Application.Queries.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetAllTrackersQueryHandler tests. Flat list across brands with per-tracker
/// scan stats (count + latest completed). Brand-tracker join + scan-stats
/// aggregate happen in separate trips for query simplicity.
/// </summary>
public class GetAllTrackersQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Brand NewBrand(string name) => new() { Id = Guid.NewGuid(), Name = name };

    private static TrackerConfiguration NewTracker(Guid brandId, string name, DateTime createdAt, TrackerStatus status = TrackerStatus.Active) => new()
    {
        Id = Guid.NewGuid(), BrandId = brandId, Name = name, Status = status, CreatedAt = createdAt,
    };

    private static ScanRun NewScan(Guid trackerId, DateTime? completedAt) => new()
    {
        Id = Guid.NewGuid(), TrackerConfigurationId = trackerId,
        TriggerType = ScanTriggerType.Manual,
        Status = completedAt.HasValue ? ScanRunStatus.Completed : ScanRunStatus.Running,
        StartedAt = (completedAt ?? DateTime.UtcNow).AddMinutes(-10),
        CompletedAt = completedAt,
    };

    [Fact]
    public async Task ReturnsEmpty_WhenNoTrackers()
    {
        using var ctx = NewContext();
        var sut = new GetAllTrackersQueryHandler(ctx);
        var result = await sut.Handle(new GetAllTrackersQuery(), CancellationToken.None);
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ReturnsTrackersWithBrandJoined()
    {
        using var ctx = NewContext();
        var brand = NewBrand("Lumina");
        var tracker = NewTracker(brand.Id, "Lumina Tracker", DateTime.UtcNow);
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.SaveChanges();

        var sut = new GetAllTrackersQueryHandler(ctx);
        var result = await sut.Handle(new GetAllTrackersQuery(), CancellationToken.None);

        result.Should().ContainSingle();
        var row = result[0];
        row.TrackerId.Should().Be(tracker.Id);
        row.Name.Should().Be("Lumina Tracker");
        row.BrandId.Should().Be(brand.Id);
        row.BrandName.Should().Be("Lumina");
        row.Status.Should().Be("Active");
        row.ScanCount.Should().Be(0);
        row.LatestScanCompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task AggregatesScanCountAndLatestCompletedAt()
    {
        using var ctx = NewContext();
        var brand = NewBrand("B");
        var tracker = NewTracker(brand.Id, "T", DateTime.UtcNow);
        ctx.Brands.Add(brand); ctx.TrackerConfigurations.Add(tracker);

        var older = new DateTime(2026, 4, 1, 12, 0, 0, DateTimeKind.Utc);
        var newer = new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc);
        ctx.ScanRuns.Add(NewScan(tracker.Id, older));
        ctx.ScanRuns.Add(NewScan(tracker.Id, newer));
        ctx.ScanRuns.Add(NewScan(tracker.Id, completedAt: null)); // running scan — counted, not in max
        ctx.SaveChanges();

        var sut = new GetAllTrackersQueryHandler(ctx);
        var result = await sut.Handle(new GetAllTrackersQuery(), CancellationToken.None);

        var row = result.Single();
        row.ScanCount.Should().Be(3);
        row.LatestScanCompletedAt.Should().Be(newer);
    }

    [Fact]
    public async Task SortsByCreatedAtDescending()
    {
        using var ctx = NewContext();
        var brand = NewBrand("B");
        var older = NewTracker(brand.Id, "Older", new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        var newer = NewTracker(brand.Id, "Newer", new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc));
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(older);
        ctx.TrackerConfigurations.Add(newer);
        ctx.SaveChanges();

        var sut = new GetAllTrackersQueryHandler(ctx);
        var result = await sut.Handle(new GetAllTrackersQuery(), CancellationToken.None);

        result.Select(r => r.Name).Should().ContainInOrder("Newer", "Older");
    }
}
