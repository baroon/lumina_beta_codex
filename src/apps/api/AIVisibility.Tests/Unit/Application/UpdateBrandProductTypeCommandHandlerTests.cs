using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Mirrors <see cref="UpdateBrandTrustSignalTypeCommandHandlerTests"/>:
/// invalid values are blocked at the controller, so the handler is
/// responsible only for persistence, the no-op case, and per-brand
/// ownership.
/// </summary>
public class UpdateBrandProductTypeCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid ProductId, Guid OtherBrandProductId);

    private static Seed Build(AppDbContext ctx, ProductType initial = ProductType.Product)
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
            Name = "Photoshop", ProductType = initial,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var otherProduct = new Product
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id, DiscoveryRunId = otherRun.Id,
            Name = "Foreign Product", ProductType = ProductType.Product,
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
    public async Task PersistsTheNewType()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandProductTypeCommandHandler(ctx).Handle(
            new UpdateBrandProductTypeCommand(seed.BrandId, seed.ProductId, ProductType.Tool),
            CancellationToken.None);

        result.ProductType.Should().Be(ProductType.Tool);
        ctx.Products.Single(p => p.Id == seed.ProductId).ProductType
            .Should().Be(ProductType.Tool);
    }

    [Fact]
    public async Task SettingSameType_IsANoOp()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initial: ProductType.Service);

        var result = await new UpdateBrandProductTypeCommandHandler(ctx).Handle(
            new UpdateBrandProductTypeCommand(seed.BrandId, seed.ProductId, ProductType.Service),
            CancellationToken.None);

        result.ProductType.Should().Be(ProductType.Service);
    }

    [Fact]
    public async Task Throws_WhenProductDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandProductTypeCommandHandler(ctx).Handle(
            new UpdateBrandProductTypeCommand(seed.BrandId, Guid.NewGuid(), ProductType.Tool),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandProductTypeCommandHandler(ctx).Handle(
            new UpdateBrandProductTypeCommand(seed.BrandId, seed.OtherBrandProductId,
                ProductType.Tool),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
