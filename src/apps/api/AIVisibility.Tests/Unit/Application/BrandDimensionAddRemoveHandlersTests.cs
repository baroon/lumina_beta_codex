using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Smoke-tests the four sibling dimension Add + Remove handlers
/// (audiences, markets, products, trust signals). Each one is the same
/// shape as <see cref="BrandTopicHandlersTests"/> / <see cref="BrandCompetitorHandlersTests"/>,
/// so this file covers the load-bearing invariants once per dimension:
/// the new row is anchored to the latest DiscoveryRun with Source =
/// UserAdded, case-insensitive duplicates per brand are rejected, and
/// Remove enforces per-brand ownership. The full topic / competitor
/// suites already exercise trim + missing-brand + empty-name paths;
/// duplicating those here would add noise without value.
/// </summary>
public class BrandDimensionAddRemoveHandlersTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid BrandId, Guid LatestRunId);

    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme", WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var older = new DiscoveryRun
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-30),
        };
        var newer = new DiscoveryRun
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-2),
        };
        ctx.Brands.Add(brand);
        ctx.DiscoveryRuns.Add(older);
        ctx.DiscoveryRuns.Add(newer);
        ctx.SaveChanges();
        return new Seed(brand.Id, newer.Id);
    }

    // -----------------------------------------------------------------------
    // Audience
    // -----------------------------------------------------------------------

    [Fact]
    public async Task AddAudience_PersistsAnchoredToLatestRun_AsUserAdded()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new AddBrandAudienceCommandHandler(ctx).Handle(
            new AddBrandAudienceCommand(seed.BrandId, "Job seekers"),
            CancellationToken.None);

        var persisted = ctx.Audiences.Single(a => a.Id == result.AudienceId);
        persisted.Name.Should().Be("Job seekers");
        persisted.Source.Should().Be(CandidateSource.UserAdded);
        persisted.DiscoveryRunId.Should().Be(seed.LatestRunId);
    }

    [Fact]
    public async Task AddAudience_RejectsDuplicate_OnSameBrand()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        ctx.Audiences.Add(new Audience
        {
            Id = Guid.NewGuid(), BrandId = seed.BrandId, DiscoveryRunId = seed.LatestRunId,
            Name = "Job seekers", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        });
        ctx.SaveChanges();

        Func<Task> act = () => new AddBrandAudienceCommandHandler(ctx).Handle(
            new AddBrandAudienceCommand(seed.BrandId, "JOB seekers"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task RemoveAudience_EnforcesPerBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var otherBrand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Beta", WebsiteUrl = "https://beta.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var otherRun = new DiscoveryRun
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id,
            Status = DiscoveryStatus.Completed, StartedAt = DateTime.UtcNow,
        };
        var otherAudience = new Audience
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id, DiscoveryRunId = otherRun.Id,
            Name = "Designers", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.Audiences.Add(otherAudience);
        ctx.SaveChanges();

        Func<Task> act = () => new RemoveBrandAudienceCommandHandler(ctx).Handle(
            new RemoveBrandAudienceCommand(seed.BrandId, otherAudience.Id),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*does not belong*");
        ctx.Audiences.Any(a => a.Id == otherAudience.Id).Should().BeTrue();
    }

    // -----------------------------------------------------------------------
    // Market
    // -----------------------------------------------------------------------

    [Fact]
    public async Task AddMarket_PersistsAnchoredToLatestRun_WithNullCountryCode()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new AddBrandMarketCommandHandler(ctx).Handle(
            new AddBrandMarketCommand(seed.BrandId, "Germany"), CancellationToken.None);

        var persisted = ctx.Markets.Single(m => m.Id == result.MarketId);
        persisted.Name.Should().Be("Germany");
        persisted.Source.Should().Be(CandidateSource.UserAdded);
        persisted.DiscoveryRunId.Should().Be(seed.LatestRunId);
        persisted.CountryCode.Should().BeNull();
    }

    [Fact]
    public async Task RemoveMarket_DeletesWhenIdBelongsToBrand()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var market = new Market
        {
            Id = Guid.NewGuid(), BrandId = seed.BrandId, DiscoveryRunId = seed.LatestRunId,
            Name = "Germany", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Markets.Add(market);
        ctx.SaveChanges();

        await new RemoveBrandMarketCommandHandler(ctx).Handle(
            new RemoveBrandMarketCommand(seed.BrandId, market.Id),
            CancellationToken.None);

        ctx.Markets.Any(m => m.Id == market.Id).Should().BeFalse();
    }

    // -----------------------------------------------------------------------
    // Product
    // -----------------------------------------------------------------------

    [Fact]
    public async Task AddProduct_PersistsWithProductTypeDefault_AndEmptyAliases()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new AddBrandProductCommandHandler(ctx).Handle(
            new AddBrandProductCommand(seed.BrandId, "Pro Resume Builder"),
            CancellationToken.None);

        var persisted = ctx.Products.Single(p => p.Id == result.ProductId);
        persisted.Name.Should().Be("Pro Resume Builder");
        persisted.Source.Should().Be(CandidateSource.UserAdded);
        persisted.DiscoveryRunId.Should().Be(seed.LatestRunId);
        persisted.ProductType.Should().Be(ProductType.Product);
        persisted.Aliases.Should().BeEmpty();
    }

    [Fact]
    public async Task RemoveProduct_EnforcesPerBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var foreignBrandId = Guid.NewGuid();
        var product = new Product
        {
            Id = Guid.NewGuid(), BrandId = foreignBrandId, DiscoveryRunId = seed.LatestRunId,
            Name = "Other", ProductType = ProductType.Product,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Products.Add(product);
        ctx.SaveChanges();

        Func<Task> act = () => new RemoveBrandProductCommandHandler(ctx).Handle(
            new RemoveBrandProductCommand(seed.BrandId, product.Id),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*does not belong*");
    }

    // -----------------------------------------------------------------------
    // TrustSignal
    // -----------------------------------------------------------------------

    [Fact]
    public async Task AddTrustSignal_PersistsWithAwardsAndRecognitionsDefault()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new AddBrandTrustSignalCommandHandler(ctx).Handle(
            new AddBrandTrustSignalCommand(seed.BrandId, "Webby Award 2025"),
            CancellationToken.None);

        var persisted = ctx.TrustSignals.Single(t => t.Id == result.TrustSignalId);
        persisted.Name.Should().Be("Webby Award 2025");
        persisted.Source.Should().Be(CandidateSource.UserAdded);
        persisted.DiscoveryRunId.Should().Be(seed.LatestRunId);
        persisted.SignalType.Should().Be(TrustSignalType.AwardsAndRecognitions);
    }

    [Fact]
    public async Task RemoveTrustSignal_DeletesWhenIdBelongsToBrand()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var signal = new TrustSignal
        {
            Id = Guid.NewGuid(), BrandId = seed.BrandId, DiscoveryRunId = seed.LatestRunId,
            SignalType = TrustSignalType.AwardsAndRecognitions,
            Name = "Webby", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.TrustSignals.Add(signal);
        ctx.SaveChanges();

        await new RemoveBrandTrustSignalCommandHandler(ctx).Handle(
            new RemoveBrandTrustSignalCommand(seed.BrandId, signal.Id),
            CancellationToken.None);

        ctx.TrustSignals.Any(t => t.Id == signal.Id).Should().BeFalse();
    }
}
