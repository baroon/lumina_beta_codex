using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Persisted Domain shape must match what SignalExtractor's
/// NormalizeDomain produces (lowercase host, no "www.", no scheme),
/// because citation classification reads the field and re-normalizes
/// inbound URLs into the same shape. Anything else would silently
/// stop classifying Competitor citations correctly.
/// </summary>
public class UpdateBrandCompetitorDomainCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid CompetitorId, Guid OtherBrandCompetitorId);

    private static Seed Build(AppDbContext ctx, string? initialDomain = null)
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
            Name = "Canva", Domain = initialDomain,
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
    public async Task NormalizesBareHostname_Lowercased()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandCompetitorDomainCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorDomainCommand(seed.BrandId, seed.CompetitorId, "  Canva.COM  "),
            CancellationToken.None);

        result.Domain.Should().Be("canva.com");
        ctx.Competitors.Single(c => c.Id == seed.CompetitorId).Domain.Should().Be("canva.com");
    }

    [Fact]
    public async Task StripsWwwPrefix()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandCompetitorDomainCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorDomainCommand(seed.BrandId, seed.CompetitorId, "www.canva.com"),
            CancellationToken.None);

        result.Domain.Should().Be("canva.com");
    }

    [Fact]
    public async Task AcceptsFullUrl_ExtractsHostOnly()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandCompetitorDomainCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorDomainCommand(seed.BrandId, seed.CompetitorId,
                "https://www.canva.com/design/about?foo=bar"),
            CancellationToken.None);

        result.Domain.Should().Be("canva.com");
    }

    [Fact]
    public async Task NullOrWhitespace_ClearsDomain()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialDomain: "canva.com");

        var result = await new UpdateBrandCompetitorDomainCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorDomainCommand(seed.BrandId, seed.CompetitorId, "   "),
            CancellationToken.None);

        result.Domain.Should().BeNull();
        ctx.Competitors.Single(c => c.Id == seed.CompetitorId).Domain.Should().BeNull();
    }

    [Fact]
    public async Task RejectsUnparseableInput()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandCompetitorDomainCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorDomainCommand(seed.BrandId, seed.CompetitorId, "not a domain!"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not a parseable hostname*");
    }

    [Fact]
    public async Task Throws_WhenCompetitorDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandCompetitorDomainCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorDomainCommand(seed.BrandId, Guid.NewGuid(), "canva.com"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandCompetitorDomainCommandHandler(ctx).Handle(
            new UpdateBrandCompetitorDomainCommand(seed.BrandId, seed.OtherBrandCompetitorId,
                "canva.com"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
