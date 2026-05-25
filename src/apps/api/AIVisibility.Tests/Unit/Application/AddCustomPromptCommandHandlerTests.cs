using AIVisibility.Application.Commands.Prompts;
using AIVisibility.Application.Queries.Prompts;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class AddCustomPromptCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static TrackerConfiguration SeedTracker(AppDbContext ctx, int allocation = 30)
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
            PromptAllocation = allocation,
            Cadence = Cadence.Weekly,
            Status = TrackerStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.SaveChanges();
        return tracker;
    }

    [Fact]
    public async Task Handle_AddsTrimmedUserAddedDraftPrompt()
    {
        using var ctx = NewContext();
        var tracker = SeedTracker(ctx);
        var checkId = Guid.NewGuid();
        var topicId = Guid.NewGuid();

        await new AddCustomPromptCommandHandler(ctx).Handle(
            new AddCustomPromptCommand(tracker.Id, "  My custom prompt  ", checkId, topicId),
            CancellationToken.None);

        var prompt = await ctx.Prompts.Include(p => p.Topics).SingleAsync();
        prompt.PromptText.Should().Be("My custom prompt");
        prompt.Source.Should().Be(PromptSource.UserAdded);
        prompt.Status.Should().Be(PromptStatus.Draft);
        prompt.VisibilityLensId.Should().Be(checkId);
        prompt.Topics.Should().ContainSingle(t => t.TopicId == topicId);
    }

    [Fact]
    public async Task Handle_Throws_WhenAllocationReached()
    {
        using var ctx = NewContext();
        var tracker = SeedTracker(ctx, allocation: 1);
        ctx.Prompts.Add(new Prompt
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            PromptText = "existing",
            VisibilityLensId = Guid.NewGuid(),
            Status = PromptStatus.Draft,
            Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var act = () => new AddCustomPromptCommandHandler(ctx).Handle(
            new AddCustomPromptCommand(tracker.Id, "another", Guid.NewGuid(), null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_Throws_WhenTextEmpty()
    {
        using var ctx = NewContext();
        var tracker = SeedTracker(ctx);

        var act = () => new AddCustomPromptCommandHandler(ctx).Handle(
            new AddCustomPromptCommand(tracker.Id, "   ", Guid.NewGuid(), null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_AddedPrompt_AppearsInTheList()
    {
        using var ctx = NewContext();
        var tracker = SeedTracker(ctx);

        await new AddCustomPromptCommandHandler(ctx).Handle(
            new AddCustomPromptCommand(tracker.Id, "My hand-written prompt", Guid.NewGuid(), null),
            CancellationToken.None);

        var list = await new ListPromptsQueryHandler(ctx).Handle(
            new ListPromptsQuery(tracker.Id),
            CancellationToken.None);

        list!.Count.Should().Be(1);
        list.Prompts.Should()
            .ContainSingle(p => p.Text == "My hand-written prompt" && p.Source == "UserAdded");
    }
}
