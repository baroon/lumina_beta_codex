using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class TrackerScheduleHandlersTests
{
    private sealed class StubScanProvider : IScanProvider
    {
        public Task<ScanAnswer> GetAnswerAsync(
            string platformCode, string prompt, CancellationToken ct = default) =>
            Task.FromResult(new ScanAnswer(true, string.Empty, null));

        public bool IsConfigured(string platformCode) => true;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static (TrackerConfiguration Tracker, Guid Platform1, Guid Platform2) Seed(
        AppDbContext ctx,
        int activePrompts = 2)
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
            Cadence = Cadence.Weekly,
            Status = TrackerStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var p1 = new AIPlatform { Id = Guid.NewGuid(), Code = "ChatGpt", Name = "ChatGPT", DisplayOrder = 1, IsDefaultSelected = true };
        var p2 = new AIPlatform { Id = Guid.NewGuid(), Code = "Gemini", Name = "Gemini", DisplayOrder = 2, IsDefaultSelected = false };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.AIPlatforms.AddRange(p1, p2);
        for (var i = 0; i < activePrompts; i++)
        {
            ctx.Prompts.Add(new Prompt
            {
                Id = Guid.NewGuid(),
                TrackerConfigurationId = tracker.Id,
                PromptText = $"Q{i}",
                VisibilityCheckId = Guid.NewGuid(),
                Status = PromptStatus.Active,
                Source = PromptSource.Generated,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        ctx.SaveChanges();
        return (tracker, p1.Id, p2.Id);
    }

    [Fact]
    public async Task GetSetup_ReturnsPlatforms_WithDefaultSelected_AndActiveCount()
    {
        using var ctx = NewContext();
        var (tracker, p1, _) = Seed(ctx);

        var result = await new GetTrackerScheduleSetupQueryHandler(ctx, new StubScanProvider()).Handle(
            new GetTrackerScheduleSetupQuery(tracker.Id),
            CancellationToken.None);

        result.Should().NotBeNull();
        result!.Platforms.Should().HaveCount(2);
        result.SelectedPlatformIds.Should().ContainSingle().Which.Should().Be(p1);
        result.ActivePromptCount.Should().Be(2);
        result.Cadence.Should().Be("Weekly");
    }

    [Fact]
    public async Task GetSetup_ReturnsNull_WhenTrackerMissing()
    {
        using var ctx = NewContext();
        var result = await new GetTrackerScheduleSetupQueryHandler(ctx, new StubScanProvider()).Handle(
            new GetTrackerScheduleSetupQuery(Guid.NewGuid()),
            CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Configure_SetsPlatformsCadence_Activates_AndCountsScanChecks()
    {
        using var ctx = NewContext();
        var (tracker, p1, p2) = Seed(ctx);

        var result = await new ConfigureTrackerScheduleCommandHandler(ctx).Handle(
            new ConfigureTrackerScheduleCommand(tracker.Id, new[] { p1, p2 }, "Daily", "UTC"),
            CancellationToken.None);

        result.ScanCheckCount.Should().Be(4); // 2 active prompts × 2 platforms
        result.Cadence.Should().Be("Daily");

        var updated = await ctx.TrackerConfigurations.FindAsync(tracker.Id);
        updated!.Status.Should().Be(TrackerStatus.Active);
        updated.Cadence.Should().Be(Cadence.Daily);
        updated.NextRunAt.Should().NotBeNull();
        (await ctx.TrackerPlatforms.CountAsync(x => x.TrackerConfigurationId == tracker.Id)).Should().Be(2);
    }

    [Fact]
    public async Task Configure_ReplacesPriorPlatformSelection()
    {
        using var ctx = NewContext();
        var (tracker, p1, p2) = Seed(ctx);
        var handler = new ConfigureTrackerScheduleCommandHandler(ctx);

        await handler.Handle(
            new ConfigureTrackerScheduleCommand(tracker.Id, new[] { p1, p2 }, "Weekly", null),
            CancellationToken.None);
        await handler.Handle(
            new ConfigureTrackerScheduleCommand(tracker.Id, new[] { p1 }, "Weekly", null),
            CancellationToken.None);

        (await ctx.TrackerPlatforms.CountAsync(x => x.TrackerConfigurationId == tracker.Id)).Should().Be(1);
    }

    [Fact]
    public async Task Configure_OnDemand_LeavesNextRunNull()
    {
        using var ctx = NewContext();
        var (tracker, p1, _) = Seed(ctx);

        await new ConfigureTrackerScheduleCommandHandler(ctx).Handle(
            new ConfigureTrackerScheduleCommand(tracker.Id, new[] { p1 }, "OnDemand", null),
            CancellationToken.None);

        var updated = await ctx.TrackerConfigurations.FindAsync(tracker.Id);
        updated!.NextRunAt.Should().BeNull();
    }

    [Fact]
    public async Task Configure_Throws_WhenNoPlatforms()
    {
        using var ctx = NewContext();
        var (tracker, _, _) = Seed(ctx);

        var act = () => new ConfigureTrackerScheduleCommandHandler(ctx).Handle(
            new ConfigureTrackerScheduleCommand(tracker.Id, Array.Empty<Guid>(), "Weekly", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Configure_Throws_WhenInvalidCadence()
    {
        using var ctx = NewContext();
        var (tracker, p1, _) = Seed(ctx);

        var act = () => new ConfigureTrackerScheduleCommandHandler(ctx).Handle(
            new ConfigureTrackerScheduleCommand(tracker.Id, new[] { p1 }, "Hourly", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
