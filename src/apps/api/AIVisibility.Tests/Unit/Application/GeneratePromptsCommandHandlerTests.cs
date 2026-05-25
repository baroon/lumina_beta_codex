using AIVisibility.Application.Commands.Prompts;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using AIVisibility.Infrastructure.Prompts;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class GeneratePromptsCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static async Task<TrackerConfiguration> SeedTrackerWithCoverage(AppDbContext ctx)
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
        ctx.Brands.Add(brand);
        ctx.DiscoveryRuns.Add(run);
        ctx.BrandProfiles.Add(new BrandProfile
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Category = "CRM",
            Confidence = 0.9,
            Source = CandidateSource.LLMSuggested,
        });
        var topic = new Topic
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Pricing",
            Confidence = 0.8,
            Source = CandidateSource.LLMSuggested,
            DiscoveryRunId = run.Id,
        };
        var competitor = new Competitor
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Rival",
            Confidence = 0.8,
            Source = CandidateSource.LLMSuggested,
            DiscoveryRunId = run.Id,
        };
        ctx.Topics.Add(topic);
        ctx.Competitors.Add(competitor);
        ctx.Markets.Add(new Market
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "US",
            Confidence = 0.8,
            Source = CandidateSource.LLMSuggested,
            DiscoveryRunId = run.Id,
        });

        // Seed checks + templates explicitly (the in-memory provider does not apply HasData).
        var check1 = new VisibilityLens { Id = Guid.NewGuid(), Code = "Discovery", Name = "Discovery", DisplayOrder = 1 };
        var check2 = new VisibilityLens
        {
            Id = Guid.NewGuid(),
            Code = "CompetitorComparison",
            Name = "Competitor Comparison",
            DisplayOrder = 2,
        };
        ctx.VisibilityLenses.AddRange(check1, check2);
        ctx.PromptTemplates.AddRange(
            new PromptTemplate
            {
                Id = Guid.NewGuid(),
                VisibilityLensId = check1.Id,
                Name = "Discovery",
                TemplateText = "What are the best {category} for {topic} in {market}?",
            },
            new PromptTemplate
            {
                Id = Guid.NewGuid(),
                VisibilityLensId = check2.Id,
                Name = "Comparison",
                TemplateText = "How does {brand} compare to {competitor}?",
            });

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
        ctx.TrackerConfigurations.Add(tracker);
        ctx.TrackerVisibilityLenses.AddRange(
            new TrackerVisibilityLens
            {
                Id = Guid.NewGuid(),
                TrackerConfigurationId = tracker.Id,
                VisibilityLensId = check1.Id,
            },
            new TrackerVisibilityLens
            {
                Id = Guid.NewGuid(),
                TrackerConfigurationId = tracker.Id,
                VisibilityLensId = check2.Id,
            });
        ctx.TrackerTopics.Add(new TrackerTopic
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            TopicId = topic.Id,
        });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            CompetitorId = competitor.Id,
        });
        await ctx.SaveChangesAsync();
        return tracker;
    }

    [Fact]
    public async Task Handle_GeneratesDraftPrompts_FromCoverageAndTemplates()
    {
        using var ctx = NewContext();
        var tracker = await SeedTrackerWithCoverage(ctx);
        var handler = new GeneratePromptsCommandHandler(ctx, new TemplatePromptGenerator());

        var result = await handler.Handle(new GeneratePromptsCommand(tracker.Id), CancellationToken.None);

        result.Count.Should().BeGreaterThan(0);
        var prompts = await ctx.Prompts.ToListAsync();
        prompts.Should().HaveCount(result.Count);
        prompts.Should().OnlyContain(p => p.Status == PromptStatus.Draft && p.Source == PromptSource.Generated);
        prompts.Should().OnlyContain(p => p.PromptText.Length > 0);
    }

    [Fact]
    public async Task Handle_ReplacesExistingDrafts_OnRegenerate()
    {
        using var ctx = NewContext();
        var tracker = await SeedTrackerWithCoverage(ctx);
        var handler = new GeneratePromptsCommandHandler(ctx, new TemplatePromptGenerator());

        var first = await handler.Handle(new GeneratePromptsCommand(tracker.Id), CancellationToken.None);
        var second = await handler.Handle(new GeneratePromptsCommand(tracker.Id), CancellationToken.None);

        second.Count.Should().Be(first.Count);
        (await ctx.Prompts.CountAsync()).Should().Be(first.Count);
    }

    [Fact]
    public async Task Handle_Throws_WhenTrackerMissing()
    {
        using var ctx = NewContext();
        var handler = new GeneratePromptsCommandHandler(ctx, new TemplatePromptGenerator());

        var act = () => handler.Handle(new GeneratePromptsCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_RegeneratesOnlyTheFilteredCheck_AndKeepsOthers()
    {
        using var ctx = NewContext();
        var tracker = await SeedTrackerWithCoverage(ctx);
        var handler = new GeneratePromptsCommandHandler(ctx, new TemplatePromptGenerator());

        await handler.Handle(new GeneratePromptsCommand(tracker.Id), CancellationToken.None);
        var discovery = await ctx.VisibilityLenses.FirstAsync(c => c.Code == "Discovery");
        var keptIds = await ctx.Prompts
            .Where(p => p.TrackerConfigurationId == tracker.Id && p.VisibilityLensId != discovery.Id)
            .Select(p => p.Id)
            .ToListAsync();

        await handler.Handle(
            new GeneratePromptsCommand(tracker.Id, VisibilityLensId: discovery.Id),
            CancellationToken.None);

        var after = await ctx.Prompts
            .Where(p => p.TrackerConfigurationId == tracker.Id)
            .ToListAsync();
        after.Where(p => p.VisibilityLensId != discovery.Id).Select(p => p.Id)
            .Should().BeEquivalentTo(keptIds);
        after.Should().Contain(p => p.VisibilityLensId == discovery.Id);
    }

    [Fact]
    public async Task Handle_KeepsUserAddedPrompts_OnRegenerate()
    {
        using var ctx = NewContext();
        var tracker = await SeedTrackerWithCoverage(ctx);
        var handler = new GeneratePromptsCommandHandler(ctx, new TemplatePromptGenerator());
        await handler.Handle(new GeneratePromptsCommand(tracker.Id), CancellationToken.None);

        var check = await ctx.VisibilityLenses.FirstAsync(c => c.Code == "Discovery");
        ctx.Prompts.Add(new Prompt
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            PromptText = "My hand-written prompt",
            VisibilityLensId = check.Id,
            Status = PromptStatus.Draft,
            Source = PromptSource.UserAdded,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        await handler.Handle(new GeneratePromptsCommand(tracker.Id), CancellationToken.None);

        var prompts = await ctx.Prompts
            .Where(p => p.TrackerConfigurationId == tracker.Id && p.Status != PromptStatus.Archived)
            .ToListAsync();
        prompts.Should().ContainSingle(p =>
            p.PromptText == "My hand-written prompt" && p.Source == PromptSource.UserAdded);
    }

    [Fact]
    public async Task Handle_DoesNotResurfaceRemovedPrompts_OnRegenerate()
    {
        using var ctx = NewContext();
        var tracker = await SeedTrackerWithCoverage(ctx);
        var handler = new GeneratePromptsCommandHandler(ctx, new TemplatePromptGenerator());
        await handler.Handle(new GeneratePromptsCommand(tracker.Id), CancellationToken.None);

        var toRemove = await ctx.Prompts.FirstAsync(p =>
            p.TrackerConfigurationId == tracker.Id && p.Status == PromptStatus.Draft);
        var removedText = toRemove.PromptText;
        await new RemovePromptCommandHandler(ctx).Handle(
            new RemovePromptCommand(tracker.Id, toRemove.Id),
            CancellationToken.None);

        await handler.Handle(new GeneratePromptsCommand(tracker.Id), CancellationToken.None);

        var active = await ctx.Prompts
            .Where(p => p.TrackerConfigurationId == tracker.Id && p.Status != PromptStatus.Archived)
            .ToListAsync();
        active.Should().NotContain(p => p.PromptText == removedText);
    }
}
