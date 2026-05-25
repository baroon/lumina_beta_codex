using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class CreateTrackerCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Brand SeedBrandWithDiscovery(AppDbContext ctx, string? category = "SaaS", string? market = "United States")
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
            Category = category,
            Confidence = 0.9,
            Source = CandidateSource.LLMSuggested,
        });
        if (market != null)
        {
            ctx.Markets.Add(new Market
            {
                Id = Guid.NewGuid(),
                BrandId = brand.Id,
                Name = market,
                Confidence = 0.8,
                Source = CandidateSource.LLMSuggested,
                DiscoveryRunId = run.Id,
            });
        }
        ctx.Products.Add(new Product
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Analytics",
            ProductType = ProductType.Product,
            Confidence = 0.8,
            Source = CandidateSource.LLMSuggested,
            DiscoveryRunId = run.Id,
        });
        ctx.Topics.Add(new Topic
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Pricing",
            Confidence = 0.8,
            Source = CandidateSource.LLMSuggested,
            DiscoveryRunId = run.Id,
        });
        ctx.Competitors.Add(new Competitor
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Rival",
            Confidence = 0.8,
            Source = CandidateSource.LLMSuggested,
            DiscoveryRunId = run.Id,
        });
        ctx.Audiences.Add(new Audience
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Marketers",
            Confidence = 0.8,
            Source = CandidateSource.LLMSuggested,
            DiscoveryRunId = run.Id,
        });
        ctx.SaveChanges();
        return brand;
    }

    [Fact]
    public async Task Handle_CreatesDraftTracker_WithGeneratedNameAndCoverage()
    {
        using var ctx = NewContext();
        var brand = SeedBrandWithDiscovery(ctx);
        var handler = new CreateTrackerCommandHandler(ctx);

        var result = await handler.Handle(new CreateTrackerCommand(brand.Id), CancellationToken.None);

        var tracker = await ctx.TrackerConfigurations
            .Include(t => t.Topics)
            .Include(t => t.Competitors)
            .Include(t => t.Products)
            .Include(t => t.Audiences)
            .Include(t => t.Markets)
            .Include(t => t.VisibilityChecks)
            .SingleAsync();

        tracker.Status.Should().Be(TrackerStatus.Draft);
        tracker.Cadence.Should().Be(Cadence.Daily);
        tracker.PromptAllocation.Should().Be(30);
        tracker.IsNameUserEdited.Should().BeFalse();
        tracker.Name.Should().Be("United States SaaS Visibility Tracker");
        result.Name.Should().Be(tracker.Name);

        tracker.Topics.Should().ContainSingle();
        tracker.Competitors.Should().ContainSingle();
        tracker.Products.Should().ContainSingle();
        tracker.Audiences.Should().ContainSingle();
        tracker.Markets.Should().ContainSingle();
        tracker.VisibilityChecks.Should().HaveCount(await ctx.VisibilityChecks.CountAsync());
    }

    [Fact]
    public async Task Handle_UsesGlobal_WhenNoMarket()
    {
        using var ctx = NewContext();
        var brand = SeedBrandWithDiscovery(ctx, category: "Chatbots", market: null);
        var handler = new CreateTrackerCommandHandler(ctx);

        var result = await handler.Handle(new CreateTrackerCommand(brand.Id), CancellationToken.None);

        result.Name.Should().Be("Global Chatbots Visibility Tracker");
    }

    [Fact]
    public async Task Handle_FlagsUserEdited_WhenDifferentNameProvided()
    {
        using var ctx = NewContext();
        var brand = SeedBrandWithDiscovery(ctx);
        var handler = new CreateTrackerCommandHandler(ctx);

        await handler.Handle(new CreateTrackerCommand(brand.Id, "My Custom Tracker"), CancellationToken.None);

        var tracker = await ctx.TrackerConfigurations.SingleAsync();
        tracker.Name.Should().Be("My Custom Tracker");
        tracker.IsNameUserEdited.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_KeepsGeneratedName_WhenProvidedNameEqualsGenerated()
    {
        using var ctx = NewContext();
        var brand = SeedBrandWithDiscovery(ctx);
        var handler = new CreateTrackerCommandHandler(ctx);

        await handler.Handle(
            new CreateTrackerCommand(brand.Id, "United States SaaS Visibility Tracker"),
            CancellationToken.None);

        var tracker = await ctx.TrackerConfigurations.SingleAsync();
        tracker.IsNameUserEdited.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_Throws_WhenBrandMissing()
    {
        using var ctx = NewContext();
        var handler = new CreateTrackerCommandHandler(ctx);

        var act = () => handler.Handle(new CreateTrackerCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
