using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Mirrors <see cref="BrandTopicHandlersTests"/>: Add anchors the new
/// row to the brand's most recent DiscoveryRun and stamps Source =
/// UserAdded; Remove enforces per-brand ownership before deleting so
/// a hostile FE can't cross-delete by guessing IDs. Verifies that
/// manual adds default Aliases to an empty list and Domain to null
/// (the deeper-edit surface for those fields lands in a follow-up).
/// </summary>
public class BrandCompetitorHandlersTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid OlderRunId, Guid NewerRunId,
        Guid ExistingCompetitorId, Guid OtherBrandCompetitorId);

    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme",
            WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1),
        };
        var otherBrand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Beta",
            WebsiteUrl = "https://beta.com",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1),
        };
        var olderRun = new DiscoveryRun
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-30),
        };
        var newerRun = new DiscoveryRun
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-2),
        };
        var otherRun = new DiscoveryRun
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-2),
        };
        var existing = new Competitor
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            DiscoveryRunId = olderRun.Id,
            Name = "Canva",
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
        };
        var otherCompetitor = new Competitor
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id,
            DiscoveryRunId = otherRun.Id,
            Name = "Figma",
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
        };

        ctx.Brands.Add(brand);
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(olderRun);
        ctx.DiscoveryRuns.Add(newerRun);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.Competitors.Add(existing);
        ctx.Competitors.Add(otherCompetitor);
        ctx.SaveChanges();
        return new Seed(
            brand.Id, otherBrand.Id, olderRun.Id, newerRun.Id,
            existing.Id, otherCompetitor.Id);
    }

    // -----------------------------------------------------------------------
    // Add
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Add_PersistsCompetitor_AnchoredToLatestRun_WithUserAddedSource()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new AddBrandCompetitorCommandHandler(ctx).Handle(
            new AddBrandCompetitorCommand(seed.BrandId, "Adobe Express"),
            CancellationToken.None);

        var persisted = ctx.Competitors.Single(c => c.Id == result.CompetitorId);
        persisted.Name.Should().Be("Adobe Express");
        persisted.Source.Should().Be(CandidateSource.UserAdded);
        persisted.Confidence.Should().Be(1.0);
        persisted.DiscoveryRunId.Should().Be(seed.NewerRunId);
        persisted.Aliases.Should().BeEmpty();
        persisted.Domain.Should().BeNull();
    }

    [Fact]
    public async Task Add_TrimsName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new AddBrandCompetitorCommandHandler(ctx).Handle(
            new AddBrandCompetitorCommand(seed.BrandId, "  Adobe Express  "),
            CancellationToken.None);

        result.Name.Should().Be("Adobe Express");
    }

    [Fact]
    public async Task Add_Throws_WhenNameIsWhitespaceOrEmpty()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var handler = new AddBrandCompetitorCommandHandler(ctx);

        Func<Task> empty = () => handler.Handle(
            new AddBrandCompetitorCommand(seed.BrandId, ""), CancellationToken.None);
        Func<Task> whitespace = () => handler.Handle(
            new AddBrandCompetitorCommand(seed.BrandId, "   "), CancellationToken.None);

        await empty.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
        await whitespace.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
    }

    [Fact]
    public async Task Add_Throws_WhenDuplicateNameExistsOnSameBrand_CaseInsensitive()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new AddBrandCompetitorCommandHandler(ctx).Handle(
            new AddBrandCompetitorCommand(seed.BrandId, "CANVA"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task Add_AllowsDuplicateName_AcrossDifferentBrands()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // "Figma" exists on the other brand but not on this one.
        var result = await new AddBrandCompetitorCommandHandler(ctx).Handle(
            new AddBrandCompetitorCommand(seed.BrandId, "Figma"),
            CancellationToken.None);

        result.Name.Should().Be("Figma");
    }

    [Fact]
    public async Task Add_Throws_WhenBrandNotFound()
    {
        using var ctx = NewContext();
        Build(ctx);

        Func<Task> act = () => new AddBrandCompetitorCommandHandler(ctx).Handle(
            new AddBrandCompetitorCommand(Guid.NewGuid(), "X"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    // -----------------------------------------------------------------------
    // Remove
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Remove_DeletesCompetitor_WhenIdBelongsToBrand()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        await new RemoveBrandCompetitorCommandHandler(ctx).Handle(
            new RemoveBrandCompetitorCommand(seed.BrandId, seed.ExistingCompetitorId),
            CancellationToken.None);

        ctx.Competitors.Any(c => c.Id == seed.ExistingCompetitorId).Should().BeFalse();
    }

    [Fact]
    public async Task Remove_Throws_WhenCompetitorBelongsToDifferentBrand()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new RemoveBrandCompetitorCommandHandler(ctx).Handle(
            new RemoveBrandCompetitorCommand(seed.BrandId, seed.OtherBrandCompetitorId),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*does not belong*");
        ctx.Competitors.Any(c => c.Id == seed.OtherBrandCompetitorId).Should().BeTrue();
    }

    [Fact]
    public async Task Remove_Throws_WhenCompetitorNotFound()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new RemoveBrandCompetitorCommandHandler(ctx).Handle(
            new RemoveBrandCompetitorCommand(seed.BrandId, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }
}
