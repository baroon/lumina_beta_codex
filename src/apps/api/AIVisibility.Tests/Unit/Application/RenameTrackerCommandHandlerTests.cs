using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Covers the rename command in isolation: trim, empty rejection,
/// per-brand case-insensitive uniqueness, no-op when the name is
/// unchanged, IsNameUserEdited flipping to true, and UpdatedAt
/// advancing on a real rename. The Postgres unique-violation
/// fallback (race between the pre-check and the insert) is not
/// reproducible against the InMemory provider — that path stays
/// untested here and is exercised in the integration suite.
/// </summary>
public class RenameTrackerCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid BrandId, Guid TrackerId, Guid SiblingTrackerId);

    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme", WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Name = "Acme · US", IsNameUserEdited = false,
            Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        var sibling = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Name = "Acme · EU", Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.TrackerConfigurations.Add(sibling);
        ctx.SaveChanges();
        return new Seed(brand.Id, tracker.Id, sibling.Id);
    }

    [Fact]
    public async Task Rename_PersistsTrimmedName_AndFlipsIsNameUserEditedTrue()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameTrackerCommandHandler(ctx).Handle(
            new RenameTrackerCommand(seed.TrackerId, "  Acme · UK  "),
            CancellationToken.None);

        result.Name.Should().Be("Acme · UK");
        var persisted = ctx.TrackerConfigurations.Single(t => t.Id == seed.TrackerId);
        persisted.Name.Should().Be("Acme · UK");
        persisted.IsNameUserEdited.Should().BeTrue();
    }

    [Fact]
    public async Task Rename_AdvancesUpdatedAt()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var before = ctx.TrackerConfigurations.Single(t => t.Id == seed.TrackerId).UpdatedAt;

        await new RenameTrackerCommandHandler(ctx).Handle(
            new RenameTrackerCommand(seed.TrackerId, "Acme · UK"),
            CancellationToken.None);

        var after = ctx.TrackerConfigurations.Single(t => t.Id == seed.TrackerId).UpdatedAt;
        after.Should().BeAfter(before);
    }

    [Fact]
    public async Task Rename_IsNoOp_WhenNameIsUnchanged_ExactMatch()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var before = ctx.TrackerConfigurations.Single(t => t.Id == seed.TrackerId).UpdatedAt;

        var result = await new RenameTrackerCommandHandler(ctx).Handle(
            new RenameTrackerCommand(seed.TrackerId, "Acme · US"),
            CancellationToken.None);

        result.Name.Should().Be("Acme · US");
        // No save, no UpdatedAt advance — the rename was a click-away
        // submit of the unchanged value.
        var after = ctx.TrackerConfigurations.Single(t => t.Id == seed.TrackerId).UpdatedAt;
        after.Should().Be(before);
    }

    [Fact]
    public async Task Rename_Throws_WhenNameIsEmptyOrWhitespace()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var handler = new RenameTrackerCommandHandler(ctx);

        Func<Task> empty = () => handler.Handle(
            new RenameTrackerCommand(seed.TrackerId, ""), CancellationToken.None);
        Func<Task> whitespace = () => handler.Handle(
            new RenameTrackerCommand(seed.TrackerId, "   "), CancellationToken.None);

        await empty.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
        await whitespace.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
    }

    [Fact]
    public async Task Rename_Throws_WhenTrackerNotFound()
    {
        using var ctx = NewContext();
        Build(ctx);

        Func<Task> act = () => new RenameTrackerCommandHandler(ctx).Handle(
            new RenameTrackerCommand(Guid.NewGuid(), "Anything"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Rename_Throws_OnCaseInsensitiveCollision_WithSiblingTracker()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new RenameTrackerCommandHandler(ctx).Handle(
            new RenameTrackerCommand(seed.TrackerId, "ACME · EU"),
            CancellationToken.None);

        await act.Should().ThrowAsync<DuplicateTrackerNameException>();
        // The original tracker's name didn't change.
        ctx.TrackerConfigurations.Single(t => t.Id == seed.TrackerId).Name
            .Should().Be("Acme · US");
    }
}
