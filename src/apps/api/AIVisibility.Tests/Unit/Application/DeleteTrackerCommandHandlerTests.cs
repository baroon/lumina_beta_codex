using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// The handler itself is a one-liner: load the row, remove it, save.
/// The real cascade work — scans + prompt runs + AI answers + mentions
/// + citations + signals + prompts + tracker_* junctions — lives in
/// the Postgres FK constraints (Cascade is verified in the
/// 20260609035748_InitialCreate migration). The EF in-memory provider
/// can't fully simulate those relational cascades, so these unit
/// tests cover only what they can: the load-remove-save path and the
/// missing-tracker error case. Full-chain cascade verification is the
/// job of integration tests run against a real Postgres database.
/// </summary>
public class DeleteTrackerCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static (Guid BrandId, Guid TrackerId) Build(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme", WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Name = "Acme · US", Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.SaveChanges();
        return (brand.Id, tracker.Id);
    }

    [Fact]
    public async Task Delete_RemovesTrackerRow()
    {
        using var ctx = NewContext();
        var (_, trackerId) = Build(ctx);

        await new DeleteTrackerCommandHandler(ctx).Handle(
            new DeleteTrackerCommand(trackerId),
            CancellationToken.None);

        ctx.TrackerConfigurations.Any(t => t.Id == trackerId).Should().BeFalse();
    }

    [Fact]
    public async Task Delete_LeavesBrandRowIntact()
    {
        using var ctx = NewContext();
        var (brandId, trackerId) = Build(ctx);

        await new DeleteTrackerCommandHandler(ctx).Handle(
            new DeleteTrackerCommand(trackerId),
            CancellationToken.None);

        // Brand survives — the cascade flows tracker → descendants, not
        // upward to the owning brand. Other trackers for the same brand
        // (and the brand's dimension rows) are unaffected by tracker
        // delete; the relational tests guarding that invariant live in
        // the integration suite.
        ctx.Brands.Any(b => b.Id == brandId).Should().BeTrue();
    }

    [Fact]
    public async Task Delete_Throws_WhenTrackerNotFound()
    {
        using var ctx = NewContext();
        Build(ctx);

        Func<Task> act = () => new DeleteTrackerCommandHandler(ctx).Handle(
            new DeleteTrackerCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Delete_LeavesSiblingTrackerIntact()
    {
        using var ctx = NewContext();
        var (brandId, doomedId) = Build(ctx);
        var sibling = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brandId,
            Name = "Sibling", Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        ctx.TrackerConfigurations.Add(sibling);
        ctx.SaveChanges();

        await new DeleteTrackerCommandHandler(ctx).Handle(
            new DeleteTrackerCommand(doomedId),
            CancellationToken.None);

        ctx.TrackerConfigurations.Any(t => t.Id == sibling.Id).Should().BeTrue();
    }
}
