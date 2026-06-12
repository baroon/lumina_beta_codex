using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Mirrors <see cref="UpdateBrandCompetitorDescriptionCommandHandlerTests"/>:
/// description is a user-facing note, not a signal-extraction input —
/// the handler trims, null-coerces empty, and enforces an upper
/// bound on length so a runaway paste doesn't bloat the row.
/// </summary>
public class UpdateBrandProductDescriptionCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid ProductId, Guid OtherBrandProductId);

    private static Seed Build(AppDbContext ctx, string? initialDescription = null)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme", WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var otherBrand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Beta", WebsiteUrl = "https://beta.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow,
        };
        var otherRun = new DiscoveryRun
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow,
        };
        var product = new Product
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Photoshop", Description = initialDescription,
            ProductType = ProductType.Product,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var otherProduct = new Product
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id, DiscoveryRunId = otherRun.Id,
            Name = "Foreign Product",
            ProductType = ProductType.Product,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(run);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.Products.Add(product);
        ctx.Products.Add(otherProduct);
        ctx.SaveChanges();
        return new Seed(brand.Id, otherBrand.Id, product.Id, otherProduct.Id);
    }

    [Fact]
    public async Task TrimsWhitespace_AndPersists()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandProductDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandProductDescriptionCommand(seed.BrandId, seed.ProductId,
                "  Industry-standard image editor.  "),
            CancellationToken.None);

        result.Description.Should().Be("Industry-standard image editor.");
        ctx.Products.Single(p => p.Id == seed.ProductId).Description
            .Should().Be("Industry-standard image editor.");
    }

    [Fact]
    public async Task NullOrWhitespace_ClearsDescription()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialDescription: "Existing note.");

        var result = await new UpdateBrandProductDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandProductDescriptionCommand(seed.BrandId, seed.ProductId, "   "),
            CancellationToken.None);

        result.Description.Should().BeNull();
        ctx.Products.Single(p => p.Id == seed.ProductId).Description.Should().BeNull();
    }

    [Fact]
    public async Task Rejects_DescriptionOverMaxLength()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandProductDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandProductDescriptionCommand(seed.BrandId, seed.ProductId,
                new string('x', 2001)),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*2000 characters or fewer*");
    }

    [Fact]
    public async Task Throws_WhenProductDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandProductDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandProductDescriptionCommand(seed.BrandId, Guid.NewGuid(), "Hello"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandProductDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandProductDescriptionCommand(seed.BrandId, seed.OtherBrandProductId,
                "Hello"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
