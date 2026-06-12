using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Country code drives flag display on discovery cards via flagcdn —
/// the stored value MUST be ISO 3166-1 alpha-2 (two letters,
/// uppercase). Discovery is best-effort and silently nulls garbage
/// from the LLM, but a user typed value must fail loudly so they
/// can correct it.
/// </summary>
public class UpdateBrandMarketCountryCodeCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid MarketId, Guid OtherBrandMarketId);

    private static Seed Build(AppDbContext ctx, string? initialCode = null)
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
        var market = new Market
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "United States", CountryCode = initialCode,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var otherMarket = new Market
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id, DiscoveryRunId = otherRun.Id,
            Name = "Foreign Market", Confidence = 0.9,
            Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(run);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.Markets.Add(market);
        ctx.Markets.Add(otherMarket);
        ctx.SaveChanges();
        return new Seed(brand.Id, otherBrand.Id, market.Id, otherMarket.Id);
    }

    [Fact]
    public async Task UppercasesAndPersists()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandMarketCountryCodeCommandHandler(ctx).Handle(
            new UpdateBrandMarketCountryCodeCommand(seed.BrandId, seed.MarketId, "  gb  "),
            CancellationToken.None);

        result.CountryCode.Should().Be("GB");
        ctx.Markets.Single(m => m.Id == seed.MarketId).CountryCode.Should().Be("GB");
    }

    [Fact]
    public async Task NullOrWhitespace_ClearsCode()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialCode: "US");

        var result = await new UpdateBrandMarketCountryCodeCommandHandler(ctx).Handle(
            new UpdateBrandMarketCountryCodeCommand(seed.BrandId, seed.MarketId, "   "),
            CancellationToken.None);

        result.CountryCode.Should().BeNull();
        ctx.Markets.Single(m => m.Id == seed.MarketId).CountryCode.Should().BeNull();
    }

    [Fact]
    public async Task Rejects_NonTwoLetterInput()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandMarketCountryCodeCommandHandler(ctx).Handle(
            new UpdateBrandMarketCountryCodeCommand(seed.BrandId, seed.MarketId, "USA"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ISO 3166-1 alpha-2*");
    }

    [Fact]
    public async Task Rejects_NonLetterInput()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandMarketCountryCodeCommandHandler(ctx).Handle(
            new UpdateBrandMarketCountryCodeCommand(seed.BrandId, seed.MarketId, "U1"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ISO 3166-1 alpha-2*");
    }

    [Fact]
    public async Task Throws_WhenMarketDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandMarketCountryCodeCommandHandler(ctx).Handle(
            new UpdateBrandMarketCountryCodeCommand(seed.BrandId, Guid.NewGuid(), "US"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandMarketCountryCodeCommandHandler(ctx).Handle(
            new UpdateBrandMarketCountryCodeCommand(seed.BrandId, seed.OtherBrandMarketId, "US"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
