using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Mirrors <see cref="UpdateBrandCompetitorAliasesCommandHandlerTests"/>
/// in shape — the alias pipeline must behave identically for the
/// product dimension since both feed the same mention-detection
/// path downstream. Silent dupes or empty entries would inflate
/// match counts; a collision with the product's primary name would
/// be load-bearing nonsense.
/// </summary>
public class UpdateBrandProductAliasesCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid ProductId, Guid OtherBrandProductId);

    private static Seed Build(AppDbContext ctx, List<string>? initialAliases = null)
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
            Name = "Photoshop", Aliases = initialAliases ?? new List<string>(),
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
    public async Task ReplacesAliasList_RatherThanMerging()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialAliases: new() { "PS", "Adobe Photoshop" });

        await new UpdateBrandProductAliasesCommandHandler(ctx).Handle(
            new UpdateBrandProductAliasesCommand(seed.BrandId, seed.ProductId,
                new[] { "Photoshop CC" }),
            CancellationToken.None);

        var persisted = ctx.Products.Single(p => p.Id == seed.ProductId);
        persisted.Aliases.Should().BeEquivalentTo(new[] { "Photoshop CC" });
    }

    [Fact]
    public async Task TrimsWhitespace_AndDropsEmptyEntries()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandProductAliasesCommandHandler(ctx).Handle(
            new UpdateBrandProductAliasesCommand(seed.BrandId, seed.ProductId,
                new[] { "  PS  ", "", "   ", "Adobe Photoshop" }),
            CancellationToken.None);

        result.Aliases.Should().BeEquivalentTo(new[] { "PS", "Adobe Photoshop" });
    }

    [Fact]
    public async Task DeduplicatesCaseInsensitively_PreservingFirstSeenOrder()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandProductAliasesCommandHandler(ctx).Handle(
            new UpdateBrandProductAliasesCommand(seed.BrandId, seed.ProductId,
                new[] { "PS", "ps", "PS", "Adobe Photoshop" }),
            CancellationToken.None);

        result.Aliases.Should().Equal("PS", "Adobe Photoshop");
    }

    [Fact]
    public async Task EmptyListIsValid_ClearsAllAliases()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialAliases: new() { "PS" });

        var result = await new UpdateBrandProductAliasesCommandHandler(ctx).Handle(
            new UpdateBrandProductAliasesCommand(seed.BrandId, seed.ProductId,
                Array.Empty<string>()),
            CancellationToken.None);

        result.Aliases.Should().BeEmpty();
    }

    [Fact]
    public async Task Rejects_AliasMatchingProductName_CaseInsensitive()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandProductAliasesCommandHandler(ctx).Handle(
            new UpdateBrandProductAliasesCommand(seed.BrandId, seed.ProductId,
                new[] { "PS", "photoshop" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*collides with the product's primary name*");
    }

    [Fact]
    public async Task Throws_WhenProductDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandProductAliasesCommandHandler(ctx).Handle(
            new UpdateBrandProductAliasesCommand(seed.BrandId, Guid.NewGuid(),
                new[] { "Whatever" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandProductAliasesCommandHandler(ctx).Handle(
            new UpdateBrandProductAliasesCommand(seed.BrandId, seed.OtherBrandProductId,
                new[] { "Whatever" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
