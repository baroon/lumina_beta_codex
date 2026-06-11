using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Mirrors <see cref="UpdateBrandAliasesCommandHandlerTests"/> in shape:
/// replace semantics, the trim / dedup / empty-filter pipeline, the
/// competitor-name collision rule, and per-brand ownership enforcement.
/// Aliases are a downstream input to mention detection — silent
/// duplicates or empty entries would inflate match counts; collisions
/// with the competitor's primary name would be load-bearing nonsense.
/// </summary>
public class UpdateBrandCompetitorAliasesCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid CompetitorId, Guid OtherBrandCompetitorId);

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
        var competitor = new Competitor
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Canva", Aliases = initialAliases ?? new List<string>(),
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var otherCompetitor = new Competitor
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id, DiscoveryRunId = otherRun.Id,
            Name = "Foreign Competitor", Confidence = 0.9,
            Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(run);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.Competitors.Add(competitor);
        ctx.Competitors.Add(otherCompetitor);
        ctx.SaveChanges();
        return new Seed(brand.Id, otherBrand.Id, competitor.Id, otherCompetitor.Id);
    }

    [Fact]
    public async Task ReplacesAliasList_RatherThanMerging()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialAliases: new() { "Canvas", "CanvaPro" });

        await new UpdateBrandCompetitorAliasesCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorAliasesCommand(seed.BrandId, seed.CompetitorId,
                new[] { "CanvaWorld" }),
            CancellationToken.None);

        var persisted = ctx.Competitors.Single(c => c.Id == seed.CompetitorId);
        persisted.Aliases.Should().BeEquivalentTo(new[] { "CanvaWorld" });
    }

    [Fact]
    public async Task TrimsWhitespace_AndDropsEmptyEntries()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandCompetitorAliasesCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorAliasesCommand(seed.BrandId, seed.CompetitorId,
                new[] { "  Canvas  ", "", "   ", "CanvaPro" }),
            CancellationToken.None);

        result.Aliases.Should().BeEquivalentTo(new[] { "Canvas", "CanvaPro" });
    }

    [Fact]
    public async Task DeduplicatesCaseInsensitively_PreservingFirstSeenOrder()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandCompetitorAliasesCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorAliasesCommand(seed.BrandId, seed.CompetitorId,
                new[] { "Canvas", "canvas", "CANVAS", "CanvaPro" }),
            CancellationToken.None);

        result.Aliases.Should().Equal("Canvas", "CanvaPro");
    }

    [Fact]
    public async Task EmptyListIsValid_ClearsAllAliases()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialAliases: new() { "Canvas" });

        var result = await new UpdateBrandCompetitorAliasesCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorAliasesCommand(seed.BrandId, seed.CompetitorId,
                Array.Empty<string>()),
            CancellationToken.None);

        result.Aliases.Should().BeEmpty();
    }

    [Fact]
    public async Task Rejects_AliasMatchingCompetitorName_CaseInsensitive()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandCompetitorAliasesCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorAliasesCommand(seed.BrandId, seed.CompetitorId,
                new[] { "Canvas", "canva" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*collides with the competitor's primary name*");
    }

    [Fact]
    public async Task Throws_WhenCompetitorDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandCompetitorAliasesCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorAliasesCommand(seed.BrandId, Guid.NewGuid(),
                new[] { "Whatever" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        // Editing the other-brand competitor's aliases via our brand's ID
        // must refuse — same shape as the existing rename/remove handlers.
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandCompetitorAliasesCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorAliasesCommand(seed.BrandId, seed.OtherBrandCompetitorId,
                new[] { "Whatever" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
