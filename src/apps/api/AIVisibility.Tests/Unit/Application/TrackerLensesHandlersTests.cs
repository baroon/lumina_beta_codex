using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Application.Queries.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Covers <see cref="GetTrackerLensesQueryHandler"/> (read) and
/// <see cref="UpdateTrackerLensesCommandHandler"/> (replace-style write):
/// asserts the lens-set is fully replaced rather than merged, the min-1
/// invariant is enforced, unknown lens IDs are filtered without throwing
/// when at least one valid ID remains, and the tracker's UpdatedAt
/// timestamp advances on each successful save.
/// </summary>
public class TrackerLensesHandlersTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid TrackerId,
        Guid LensCategoryId, Guid LensComparisonId, Guid LensProblemId);

    /// <summary>
    /// Seeds one tracker with 2 of the 3 lenses pre-selected (Category +
    /// Comparison). Problem lens exists in the catalog but is not in the
    /// tracker's set — useful for testing additive selection.
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = "Acme · US", Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        var category = new Lens { Id = Guid.NewGuid(), Code = "category", Name = "Category Discovery", DisplayOrder = 1 };
        var comparison = new Lens { Id = Guid.NewGuid(), Code = "comparison", Name = "Comparison", DisplayOrder = 2 };
        var problem = new Lens { Id = Guid.NewGuid(), Code = "problem", Name = "Problem Resolution", DisplayOrder = 3 };

        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.Lenses.Add(category);
        ctx.Lenses.Add(comparison);
        ctx.Lenses.Add(problem);
        ctx.TrackerLenses.Add(new TrackerLens { TrackerConfigurationId = tracker.Id, LensId = category.Id });
        ctx.TrackerLenses.Add(new TrackerLens { TrackerConfigurationId = tracker.Id, LensId = comparison.Id });
        ctx.SaveChanges();

        return new Seed(tracker.Id, category.Id, comparison.Id, problem.Id);
    }

    // -----------------------------------------------------------------------
    // GetTrackerLensesQuery
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GetLenses_ReturnsAllLenses_OrderedByDisplayOrder_WithSelectionMarked()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new GetTrackerLensesQueryHandler(ctx)
            .Handle(new GetTrackerLensesQuery(seed.TrackerId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.TrackerId.Should().Be(seed.TrackerId);
        result.Lenses.Should().HaveCount(3);
        result.Lenses.Select(l => l.DisplayOrder).Should().BeInAscendingOrder();
        result.SelectedLensIds.Should().BeEquivalentTo(new[] { seed.LensCategoryId, seed.LensComparisonId });
    }

    [Fact]
    public async Task GetLenses_ReturnsNull_WhenTrackerNotFound()
    {
        using var ctx = NewContext();

        var result = await new GetTrackerLensesQueryHandler(ctx)
            .Handle(new GetTrackerLensesQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    // -----------------------------------------------------------------------
    // UpdateTrackerLensesCommand
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Update_ReplacesLensSet_RatherThanMerging()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // Swap Comparison → Problem. Final set should be {Category, Problem}.
        var result = await new UpdateTrackerLensesCommandHandler(ctx)
            .Handle(
                new UpdateTrackerLensesCommand(seed.TrackerId, new[] { seed.LensCategoryId, seed.LensProblemId }),
                CancellationToken.None);

        result.SelectedLensCount.Should().Be(2);
        var persisted = ctx.TrackerLenses
            .Where(x => x.TrackerConfigurationId == seed.TrackerId)
            .Select(x => x.LensId)
            .ToList();
        persisted.Should().BeEquivalentTo(new[] { seed.LensCategoryId, seed.LensProblemId });
    }

    [Fact]
    public async Task Update_IsIdempotent_WhenSavingTheSameSet()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var handler = new UpdateTrackerLensesCommandHandler(ctx);
        await handler.Handle(
            new UpdateTrackerLensesCommand(seed.TrackerId, new[] { seed.LensCategoryId, seed.LensComparisonId }),
            CancellationToken.None);
        var second = await handler.Handle(
            new UpdateTrackerLensesCommand(seed.TrackerId, new[] { seed.LensCategoryId, seed.LensComparisonId }),
            CancellationToken.None);

        second.SelectedLensCount.Should().Be(2);
        ctx.TrackerLenses
            .Count(x => x.TrackerConfigurationId == seed.TrackerId)
            .Should().Be(2);
    }

    [Fact]
    public async Task Update_DeduplicatesInputLensIds()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // Same ID three times → handler stores it once.
        var result = await new UpdateTrackerLensesCommandHandler(ctx)
            .Handle(
                new UpdateTrackerLensesCommand(
                    seed.TrackerId,
                    new[] { seed.LensCategoryId, seed.LensCategoryId, seed.LensCategoryId }),
                CancellationToken.None);

        result.SelectedLensCount.Should().Be(1);
    }

    [Fact]
    public async Task Update_FiltersUnknownLensIds_WhenAtLeastOneValid()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // One unknown UUID alongside Category — unknown is silently dropped.
        var result = await new UpdateTrackerLensesCommandHandler(ctx)
            .Handle(
                new UpdateTrackerLensesCommand(seed.TrackerId, new[] { Guid.NewGuid(), seed.LensCategoryId }),
                CancellationToken.None);

        result.SelectedLensCount.Should().Be(1);
        ctx.TrackerLenses
            .Where(x => x.TrackerConfigurationId == seed.TrackerId)
            .Select(x => x.LensId)
            .Single().Should().Be(seed.LensCategoryId);
    }

    [Fact]
    public async Task Update_Throws_WhenEmptyLensSetProvided()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateTrackerLensesCommandHandler(ctx)
            .Handle(
                new UpdateTrackerLensesCommand(seed.TrackerId, Array.Empty<Guid>()),
                CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*At least one lens*");
    }

    [Fact]
    public async Task Update_Throws_WhenAllSuppliedLensIdsAreUnknown()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateTrackerLensesCommandHandler(ctx)
            .Handle(
                new UpdateTrackerLensesCommand(seed.TrackerId, new[] { Guid.NewGuid(), Guid.NewGuid() }),
                CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*None of the supplied lens IDs*");
    }

    [Fact]
    public async Task Update_Throws_WhenTrackerDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateTrackerLensesCommandHandler(ctx)
            .Handle(
                new UpdateTrackerLensesCommand(Guid.NewGuid(), new[] { seed.LensCategoryId }),
                CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not found*");
    }

    [Fact]
    public async Task Update_AdvancesTrackerUpdatedAt()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var before = ctx.TrackerConfigurations.Single(t => t.Id == seed.TrackerId).UpdatedAt;

        await new UpdateTrackerLensesCommandHandler(ctx)
            .Handle(
                new UpdateTrackerLensesCommand(seed.TrackerId, new[] { seed.LensCategoryId }),
                CancellationToken.None);

        var after = ctx.TrackerConfigurations.Single(t => t.Id == seed.TrackerId).UpdatedAt;
        after.Should().BeAfter(before);
    }
}
