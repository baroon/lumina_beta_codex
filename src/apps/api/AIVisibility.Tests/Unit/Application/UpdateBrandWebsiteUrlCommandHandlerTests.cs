using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Covers the website-URL update: trim, empty rejection, absolute
/// http(s) URL validation, no-op when the URL is unchanged, missing
/// brand error, and UpdatedAt advancement. The crawler only ever
/// exercises http(s) — non-web schemes like file:// or chrome:// are
/// rejected even though Uri.TryCreate would otherwise accept them.
/// </summary>
public class UpdateBrandWebsiteUrlCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Guid SeedBrand(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme",
            WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        ctx.Brands.Add(brand);
        ctx.SaveChanges();
        return brand.Id;
    }

    [Fact]
    public async Task Update_PersistsTrimmedUrl()
    {
        using var ctx = NewContext();
        var brandId = SeedBrand(ctx);

        var result = await new UpdateBrandWebsiteUrlCommandHandler(ctx).Handle(
            new UpdateBrandWebsiteUrlCommand(brandId, "  https://new-acme.com  "),
            CancellationToken.None);

        result.WebsiteUrl.Should().Be("https://new-acme.com");
        ctx.Brands.Single(b => b.Id == brandId).WebsiteUrl.Should().Be("https://new-acme.com");
    }

    [Fact]
    public async Task Update_AdvancesUpdatedAt()
    {
        using var ctx = NewContext();
        var brandId = SeedBrand(ctx);
        var before = ctx.Brands.Single(b => b.Id == brandId).UpdatedAt;

        await new UpdateBrandWebsiteUrlCommandHandler(ctx).Handle(
            new UpdateBrandWebsiteUrlCommand(brandId, "https://new-acme.com"),
            CancellationToken.None);

        ctx.Brands.Single(b => b.Id == brandId).UpdatedAt.Should().BeAfter(before);
    }

    [Fact]
    public async Task Update_IsNoOp_WhenUrlIsUnchanged()
    {
        using var ctx = NewContext();
        var brandId = SeedBrand(ctx);
        var before = ctx.Brands.Single(b => b.Id == brandId).UpdatedAt;

        var result = await new UpdateBrandWebsiteUrlCommandHandler(ctx).Handle(
            new UpdateBrandWebsiteUrlCommand(brandId, "https://acme.com"),
            CancellationToken.None);

        result.WebsiteUrl.Should().Be("https://acme.com");
        ctx.Brands.Single(b => b.Id == brandId).UpdatedAt.Should().Be(before);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Update_Throws_WhenUrlIsEmptyOrWhitespace(string url)
    {
        using var ctx = NewContext();
        var brandId = SeedBrand(ctx);

        Func<Task> act = () => new UpdateBrandWebsiteUrlCommandHandler(ctx).Handle(
            new UpdateBrandWebsiteUrlCommand(brandId, url),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
    }

    [Theory]
    [InlineData("acme.com")]              // missing scheme
    [InlineData("/relative/path")]        // relative
    [InlineData("file:///etc/passwd")]    // non-http scheme
    [InlineData("javascript:alert(1)")]   // non-http scheme
    public async Task Update_Throws_WhenUrlIsNotAbsoluteHttp(string url)
    {
        using var ctx = NewContext();
        var brandId = SeedBrand(ctx);

        Func<Task> act = () => new UpdateBrandWebsiteUrlCommandHandler(ctx).Handle(
            new UpdateBrandWebsiteUrlCommand(brandId, url),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*absolute http*");
    }

    [Fact]
    public async Task Update_Throws_WhenBrandNotFound()
    {
        using var ctx = NewContext();
        SeedBrand(ctx);

        Func<Task> act = () => new UpdateBrandWebsiteUrlCommandHandler(ctx).Handle(
            new UpdateBrandWebsiteUrlCommand(Guid.NewGuid(), "https://new.com"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }
}
