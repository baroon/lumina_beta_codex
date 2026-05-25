using AIVisibility.Application.Commands.Scans;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
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
                VisibilityLensId = Guid.NewGuid(),
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
                Id = Guid.NewGuid(),
                TrackerConfigurationId = tracker.Id,
                AIPlatformId = p.Id,
            });
        }
        ctx.SaveChanges();
        return tracker;
    }

    [Fact]
    public async Task Run_CreatesRun_FansOut_AndEnqueues()
    {
        using var ctx = NewContext();
        var tracker = Seed(ctx);
        var queue = new Mock<IScanQueue>();

        var result = await new RunScanCommandHandler(ctx, queue.Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        result.ScanCheckCount.Should().Be(4); // 2 prompts × 2 platforms
        (await ctx.ScanRuns.CountAsync()).Should().Be(1);
        (await ctx.PromptRuns.CountAsync()).Should().Be(4);
        (await ctx.PromptRuns.AllAsync(p => p.Status == PromptRunStatus.Pending)).Should().BeTrue();
        (await ctx.TrackerConfigurations.FindAsync(tracker.Id))!.LastRunAt.Should().NotBeNull();
        queue.Verify(q => q.Enqueue(result.ScanRunId), Times.Once);
    }

    [Fact]
    public async Task Run_Throws_WhenNoActivePrompts()
    {
        using var ctx = NewContext();
        var tracker = Seed(ctx, activePrompts: 0);

        var act = () => new RunScanCommandHandler(ctx, new Mock<IScanQueue>().Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Run_OnDemand_Throws_WhenRunWithin24h()
    {
        using var ctx = NewContext();
        var tracker = Seed(ctx, cadence: Cadence.OnDemand, lastRunAt: DateTime.UtcNow.AddHours(-2));

        var act = () => new RunScanCommandHandler(ctx, new Mock<IScanQueue>().Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Run_OnDemand_Allows_WhenOver24h()
    {
        using var ctx = NewContext();
        var tracker = Seed(ctx, cadence: Cadence.OnDemand, lastRunAt: DateTime.UtcNow.AddHours(-25));

        var result = await new RunScanCommandHandler(ctx, new Mock<IScanQueue>().Object).Handle(
            new RunScanCommand(tracker.Id),
            CancellationToken.None);

        result.ScanCheckCount.Should().Be(4);
    }
}
