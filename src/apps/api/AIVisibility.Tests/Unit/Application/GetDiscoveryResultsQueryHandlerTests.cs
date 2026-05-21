using AIVisibility.Application.Queries.Discovery;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class GetDiscoveryResultsQueryHandlerTests
{
    [Fact]
    public async Task Handle_ShouldReturnNullForNonexistentBrand()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);
        var handler = new GetDiscoveryResultsQueryHandler(context);

        var result = await handler.Handle(new GetDiscoveryResultsQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ShouldReturnAllCandidateTypes()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Status = DiscoveryStatus.AwaitingConfirmation,
            StartedAt = DateTime.UtcNow
        };

        context.Brands.Add(brand);
        context.DiscoveryRuns.Add(run);
        context.Products.Add(new Product
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            DiscoveryRunId = run.Id,
            Name = "Test Product",
            Status = CandidateStatus.Suggested,
            Source = CandidateSource.WebsiteCrawl,
            Confidence = 0.7
        });
        context.Markets.Add(new Market
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            DiscoveryRunId = run.Id,
            Name = "Global",
            Status = CandidateStatus.Suggested,
            Source = CandidateSource.WebsiteCrawl,
            Confidence = 0.5
        });
        await context.SaveChangesAsync();

        var handler = new GetDiscoveryResultsQueryHandler(context);
        var result = await handler.Handle(new GetDiscoveryResultsQuery(brand.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.BrandName.Should().Be("Test Brand");
        result.Products.Should().HaveCount(1);
        result.Markets.Should().HaveCount(1);
        result.Status.Should().Be("AwaitingConfirmation");
    }
}
