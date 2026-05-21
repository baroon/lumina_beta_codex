using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Discovery;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using AIVisibility.Infrastructure.Discovery;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AIVisibility.Tests.Unit.Application;

public class GetDiscoveryResultsQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static IDiscoveryDraftStore NewStore() =>
        new MemoryDiscoveryDraftStore(new MemoryCache(new MemoryCacheOptions()));

    private static (Brand brand, DiscoveryRun run) Seed(AppDbContext ctx, DiscoveryStatus status)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Status = status,
            StartedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.DiscoveryRuns.Add(run);
        ctx.SaveChanges();
        return (brand, run);
    }

    [Fact]
    public async Task Handle_ShouldReturnNullForNonexistentBrand()
    {
        using var ctx = NewContext();
        var handler = new GetDiscoveryResultsQueryHandler(ctx, NewStore());

        var result = await handler.Handle(new GetDiscoveryResultsQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnTheDraftForTheLatestRun()
    {
        using var ctx = NewContext();
        var (brand, run) = Seed(ctx, DiscoveryStatus.AwaitingConfirmation);

        brand.Aliases = new List<string> { "Acme Inc" };
        await ctx.SaveChangesAsync();

        var store = NewStore();
        store.Save(run.Id, new DiscoveryResultsDto(
            brand.Id, brand.Name, "AwaitingConfirmation", null,
            new List<CandidateDto> { new(Guid.NewGuid(), "Analytics", null, 0.9, "LLMSuggested", new()) },
            new(), new(), new(), new(), new(), new()));

        var handler = new GetDiscoveryResultsQueryHandler(ctx, store);
        var result = await handler.Handle(new GetDiscoveryResultsQuery(brand.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Products.Should().ContainSingle(p => p.Name == "Analytics");
        // Aliases come from the durable brand, overriding the cached draft.
        result.Aliases.Should().Contain("Acme Inc");
    }

    [Fact]
    public async Task Handle_ShouldReturnMinimalResultWhenDraftMissing()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx, DiscoveryStatus.Completed);

        var handler = new GetDiscoveryResultsQueryHandler(ctx, NewStore());
        var result = await handler.Handle(new GetDiscoveryResultsQuery(brand.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Status.Should().Be("Completed");
        result.Products.Should().BeEmpty();
        result.BrandProfile.Should().BeNull();
    }
}
