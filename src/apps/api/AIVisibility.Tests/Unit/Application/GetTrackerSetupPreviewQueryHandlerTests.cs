using AIVisibility.Application.Queries.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class GetTrackerSetupPreviewQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Handle_ReturnsNull_WhenBrandMissing()
    {
        using var ctx = NewContext();
        var handler = new GetTrackerSetupPreviewQueryHandler(ctx);

        var result = await handler.Handle(new GetTrackerSetupPreviewQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ReturnsSuggestedNameAndCounts()
    {
        using var ctx = NewContext();
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
            DiscoveryRunId = run.Id,
            Category = "SaaS",
            Confidence = 0.9,
            Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        ctx.Markets.Add(new Market
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "United States",
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
        ctx.SaveChanges();
        var handler = new GetTrackerSetupPreviewQueryHandler(ctx);

        var result = await handler.Handle(new GetTrackerSetupPreviewQuery(brand.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.SuggestedName.Should().Be("United States SaaS Visibility Tracker");
        result.MarketName.Should().Be("United States");
        result.Category.Should().Be("SaaS");
        result.TopicCount.Should().Be(1);
        result.MarketCount.Should().Be(1);
        result.PromptAllocation.Should().Be(30);
    }
}
