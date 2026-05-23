using AIVisibility.Application.Commands.Prompts;
using AIVisibility.Application.Queries.Prompts;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class PromptReviewHandlersTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static (TrackerConfiguration Tracker, Guid Prompt1, Guid Prompt2) Seed(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Acme",
            WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow,
        };
        var check = new VisibilityCheck { Id = Guid.NewGuid(), Code = "Discovery", Name = "Discovery", DisplayOrder = 1 };
        var topic = new Topic
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Pricing",
            Confidence = 0.8,
            Source = CandidateSource.LLMSuggested,
            DiscoveryRunId = run.Id,
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
        var p1 = new Prompt
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            PromptText = "What are the best CRM for Pricing?",
            VisibilityCheckId = check.Id,
            PrimaryTopicId = topic.Id,
            Status = PromptStatus.Draft,
            Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var p2 = new Prompt
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            PromptText = "How does Acme compare to Rival?",
            VisibilityCheckId = check.Id,
            Status = PromptStatus.Draft,
            Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow.AddSeconds(1),
            UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.DiscoveryRuns.Add(run);
        ctx.VisibilityChecks.Add(check);
        ctx.Topics.Add(topic);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.Prompts.AddRange(p1, p2);
        ctx.SaveChanges();
        return (tracker, p1.Id, p2.Id);
    }

    [Fact]
    public async Task List_ReturnsNonArchivedPrompts_WithCheckAndTopicNames()
    {
        using var ctx = NewContext();
        var (tracker, _, _) = Seed(ctx);
        var handler = new ListPromptsQueryHandler(ctx);

        var result = await handler.Handle(new ListPromptsQuery(tracker.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.PromptAllocation.Should().Be(30);
        result.Count.Should().Be(2);
        result.Prompts.Should().Contain(p => p.VisibilityCheckName == "Discovery");
        result.Prompts.Should().Contain(p => p.PrimaryTopicName == "Pricing");
    }

    [Fact]
    public async Task List_ReturnsNull_WhenTrackerMissing()
    {
        using var ctx = NewContext();
        var handler = new ListPromptsQueryHandler(ctx);

        var result = await handler.Handle(new ListPromptsQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task Remove_ArchivesPrompt_AndDropsItFromTheList()
    {
        using var ctx = NewContext();
        var (tracker, p1, _) = Seed(ctx);
        await new RemovePromptCommandHandler(ctx).Handle(
            new RemovePromptCommand(tracker.Id, p1),
            CancellationToken.None);

        var archived = await ctx.Prompts.FindAsync(p1);
        archived!.Status.Should().Be(PromptStatus.Archived);
        archived.ArchivedAt.Should().NotBeNull();

        var list = await new ListPromptsQueryHandler(ctx).Handle(
            new ListPromptsQuery(tracker.Id),
            CancellationToken.None);
        list!.Count.Should().Be(1);
    }

    [Fact]
    public async Task Confirm_ActivatesAllDraftPrompts()
    {
        using var ctx = NewContext();
        var (tracker, _, _) = Seed(ctx);

        var result = await new ConfirmPromptsCommandHandler(ctx).Handle(
            new ConfirmPromptsCommand(tracker.Id),
            CancellationToken.None);

        result.ActivatedCount.Should().Be(2);
        (await ctx.Prompts.Where(p => p.TrackerConfigurationId == tracker.Id).ToListAsync())
            .Should().OnlyContain(p => p.Status == PromptStatus.Active);
    }

    [Fact]
    public async Task Update_ChangesPromptText()
    {
        using var ctx = NewContext();
        var (tracker, p1, _) = Seed(ctx);

        await new UpdatePromptCommandHandler(ctx).Handle(
            new UpdatePromptCommand(tracker.Id, p1, "  Edited prompt text  "),
            CancellationToken.None);

        var updated = await ctx.Prompts.FindAsync(p1);
        updated!.PromptText.Should().Be("Edited prompt text");
    }

    [Fact]
    public async Task Update_Throws_WhenTextEmpty()
    {
        using var ctx = NewContext();
        var (tracker, p1, _) = Seed(ctx);

        var act = () => new UpdatePromptCommandHandler(ctx).Handle(
            new UpdatePromptCommand(tracker.Id, p1, "   "),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
