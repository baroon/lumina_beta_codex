using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Covers replace semantics, the trim / dedup / empty-filter pipeline,
/// the brand-name collision rule, and the UpdatedAt bump invariant.
/// Aliases are a downstream input to mention detection — silent
/// duplicates or empty entries would inflate match counts, hence the
/// strict normalization here.
/// </summary>
public class UpdateBrandAliasesCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Brand Seed(AppDbContext ctx, string name = "Acme", List<string>? aliases = null)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = name,
            WebsiteUrl = "https://acme.com",
            Aliases = aliases ?? new List<string>(),
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        ctx.Brands.Add(brand);
        ctx.SaveChanges();
        return brand;
    }

    [Fact]
    public async Task ReplacesAliasList_RatherThanMerging()
    {
        using var ctx = NewContext();
        var brand = Seed(ctx, aliases: new() { "AcmeCorp", "Acme Inc" });

        await new UpdateBrandAliasesCommandHandler(ctx).Handle(
            new UpdateBrandAliasesCommand(brand.Id, new[] { "AcmeWorld" }),
            CancellationToken.None);

        var persisted = ctx.Brands.Single(b => b.Id == brand.Id);
        persisted.Aliases.Should().BeEquivalentTo(new[] { "AcmeWorld" });
    }

    [Fact]
    public async Task TrimsWhitespace_AndDropsEmptyEntries()
    {
        using var ctx = NewContext();
        var brand = Seed(ctx);

        var result = await new UpdateBrandAliasesCommandHandler(ctx).Handle(
            new UpdateBrandAliasesCommand(brand.Id, new[] { "  AcmeCorp  ", "", "   ", "Acme Inc" }),
            CancellationToken.None);

        result.Aliases.Should().BeEquivalentTo(new[] { "AcmeCorp", "Acme Inc" });
    }

    [Fact]
    public async Task DeduplicatesCaseInsensitively_PreservingFirstSeenOrder()
    {
        using var ctx = NewContext();
        var brand = Seed(ctx);

        var result = await new UpdateBrandAliasesCommandHandler(ctx).Handle(
            new UpdateBrandAliasesCommand(brand.Id, new[] { "AcmeCorp", "acmecorp", "ACMECORP", "Acme Inc" }),
            CancellationToken.None);

        // First-seen casing wins; duplicates after differ-by-case are dropped.
        result.Aliases.Should().Equal("AcmeCorp", "Acme Inc");
    }

    [Fact]
    public async Task EmptyListIsValid_ClearsAllAliases()
    {
        using var ctx = NewContext();
        var brand = Seed(ctx, aliases: new() { "AcmeCorp" });

        var result = await new UpdateBrandAliasesCommandHandler(ctx).Handle(
            new UpdateBrandAliasesCommand(brand.Id, Array.Empty<string>()),
            CancellationToken.None);

        result.Aliases.Should().BeEmpty();
        ctx.Brands.Single(b => b.Id == brand.Id).Aliases.Should().BeEmpty();
    }

    [Fact]
    public async Task RejectsAlias_WhenItCollidesWithBrandNameCaseInsensitively()
    {
        using var ctx = NewContext();
        var brand = Seed(ctx, name: "Acme");

        Func<Task> act = () => new UpdateBrandAliasesCommandHandler(ctx).Handle(
            new UpdateBrandAliasesCommand(brand.Id, new[] { "AcmeCorp", "acme" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*collides with the brand's primary name*");
    }

    [Fact]
    public async Task ThrowsWhenBrandDoesNotExist()
    {
        using var ctx = NewContext();

        Func<Task> act = () => new UpdateBrandAliasesCommandHandler(ctx).Handle(
            new UpdateBrandAliasesCommand(Guid.NewGuid(), new[] { "AcmeCorp" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task AdvancesUpdatedAt()
    {
        using var ctx = NewContext();
        var brand = Seed(ctx);
        var before = ctx.Brands.Single(b => b.Id == brand.Id).UpdatedAt;

        await new UpdateBrandAliasesCommandHandler(ctx).Handle(
            new UpdateBrandAliasesCommand(brand.Id, new[] { "AcmeCorp" }),
            CancellationToken.None);

        var after = ctx.Brands.Single(b => b.Id == brand.Id).UpdatedAt;
        after.Should().BeAfter(before);
    }
}
