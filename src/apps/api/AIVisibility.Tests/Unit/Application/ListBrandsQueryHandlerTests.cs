using AIVisibility.Application.Queries.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class ListBrandsQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Handle_ReturnsBrands_NewestFirst_WithLatestDiscoveryStatus()
    {
        using var ctx = NewContext();
        var older = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Older",
            WebsiteUrl = "https://older.com",
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            UpdatedAt = DateTime.UtcNow.AddDays(-2),
        };
        var newer = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Newer",
            WebsiteUrl = "https://newer.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.AddRange(older, newer);
        ctx.DiscoveryRuns.Add(new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = newer.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow,
        });
        await ctx.SaveChangesAsync();

        var handler = new ListBrandsQueryHandler(ctx);
        var result = await handler.Handle(new ListBrandsQuery(), CancellationToken.None);

        result.Should().HaveCount(2);
        result[0].Name.Should().Be("Newer");
        result[0].LatestDiscovery!.Status.Should().Be("Completed");
        result[1].Name.Should().Be("Older");
        result[1].LatestDiscovery.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ReturnsEmpty_WhenNoBrands()
    {
        using var ctx = NewContext();
        var handler = new ListBrandsQueryHandler(ctx);

        var result = await handler.Handle(new ListBrandsQuery(), CancellationToken.None);

        result.Should().BeEmpty();
    }
}
