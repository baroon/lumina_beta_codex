using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class ConfirmDiscoveryCommandHandlerTests
{
    [Fact]
    public async Task Handle_ShouldThrowWhenBrandNotFound()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);
        var handler = new ConfirmDiscoveryCommandHandler(context);

        var command = new ConfirmDiscoveryCommand(Guid.NewGuid(), new List<Guid> { Guid.NewGuid() }, new List<Guid>());

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_ShouldConfirmAndDismissCandidates()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            WebsiteUrl = "https://test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var product1 = new Product
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Product 1",
            Status = CandidateStatus.Suggested,
            Source = CandidateSource.WebsiteCrawl,
            Confidence = 0.8
        };

        var product2 = new Product
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = "Product 2",
            Status = CandidateStatus.Suggested,
            Source = CandidateSource.WebsiteCrawl,
            Confidence = 0.5
        };

        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Status = DiscoveryStatus.AwaitingConfirmation,
            StartedAt = DateTime.UtcNow
        };

        context.Brands.Add(brand);
        context.Products.AddRange(product1, product2);
        context.DiscoveryRuns.Add(run);
        await context.SaveChangesAsync();

        var handler = new ConfirmDiscoveryCommandHandler(context);
        var command = new ConfirmDiscoveryCommand(
            brand.Id,
            new List<Guid> { product1.Id },
            new List<Guid> { product2.Id });

        await handler.Handle(command, CancellationToken.None);

        var updatedProduct1 = await context.Products.FindAsync(product1.Id);
        var updatedProduct2 = await context.Products.FindAsync(product2.Id);

        updatedProduct1!.Status.Should().Be(CandidateStatus.Confirmed);
        updatedProduct2!.Status.Should().Be(CandidateStatus.Dismissed);
    }
}
