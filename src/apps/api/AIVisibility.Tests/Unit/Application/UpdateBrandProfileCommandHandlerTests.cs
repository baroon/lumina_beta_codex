using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Covers in-place edits of BrandProfile identity fields. The Source /
/// Confidence / DiscoveryRunId attribution fields belong to the row's
/// origin, not to a manual edit, so the handler must leave them
/// untouched even when the four free-text fields change. Whitespace-
/// only input collapses to null so the DB never stores " " — same
/// normalization rule the FE relies on for the "Not set" fallback.
/// </summary>
public class UpdateBrandProfileCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid BrandId, Guid ProfileId, Guid DiscoveryRunId);

    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme",
            WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Status = DiscoveryStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-7),
        };
        var profile = new BrandProfile
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            DiscoveryRunId = run.Id,
            ShortDescription = "Career platform",
            Industry = "Career Services",
            Category = "SaaS",
            Positioning = "Empowering job seekers.",
            Confidence = 0.9,
            Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        ctx.Brands.Add(brand);
        ctx.DiscoveryRuns.Add(run);
        ctx.BrandProfiles.Add(profile);
        ctx.SaveChanges();
        return new Seed(brand.Id, profile.Id, run.Id);
    }

    [Fact]
    public async Task UpdatesFieldsInPlace()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandProfileCommandHandler(ctx).Handle(
            new UpdateBrandProfileCommand(
                seed.BrandId,
                ShortDescription: "Updated description",
                Industry: "Tech",
                Category: "SaaS Platform",
                Positioning: "New positioning."),
            CancellationToken.None);

        result.ShortDescription.Should().Be("Updated description");
        result.Industry.Should().Be("Tech");
        result.Category.Should().Be("SaaS Platform");
        result.Positioning.Should().Be("New positioning.");
    }

    [Fact]
    public async Task PreservesSourceConfidenceAndDiscoveryRunId()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        await new UpdateBrandProfileCommandHandler(ctx).Handle(
            new UpdateBrandProfileCommand(seed.BrandId, "x", "y", "z", "w"),
            CancellationToken.None);

        var persisted = ctx.BrandProfiles.Single(p => p.BrandId == seed.BrandId);
        persisted.Source.Should().Be(CandidateSource.LLMSuggested);
        persisted.Confidence.Should().Be(0.9);
        persisted.DiscoveryRunId.Should().Be(seed.DiscoveryRunId);
    }

    [Fact]
    public async Task TrimsWhitespace_AndCollapsesEmptyOrWhitespaceOnlyToNull()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandProfileCommandHandler(ctx).Handle(
            new UpdateBrandProfileCommand(
                seed.BrandId,
                ShortDescription: "  trimmed  ",
                Industry: "",
                Category: "   ",
                Positioning: null),
            CancellationToken.None);

        result.ShortDescription.Should().Be("trimmed");
        result.Industry.Should().BeNull();
        result.Category.Should().BeNull();
        result.Positioning.Should().BeNull();
    }

    [Fact]
    public async Task ThrowsWhenBrandProfileDoesNotExist()
    {
        using var ctx = NewContext();

        Func<Task> act = () => new UpdateBrandProfileCommandHandler(ctx).Handle(
            new UpdateBrandProfileCommand(Guid.NewGuid(), "x", "y", "z", "w"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*No BrandProfile*");
    }

    [Fact]
    public async Task AdvancesUpdatedAt_OnBothProfileAndBrand()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var brandBefore = ctx.Brands.Single(b => b.Id == seed.BrandId).UpdatedAt;
        var profileBefore = ctx.BrandProfiles.Single(p => p.BrandId == seed.BrandId).UpdatedAt;

        await new UpdateBrandProfileCommandHandler(ctx).Handle(
            new UpdateBrandProfileCommand(seed.BrandId, "x", null, null, null),
            CancellationToken.None);

        var brandAfter = ctx.Brands.Single(b => b.Id == seed.BrandId).UpdatedAt;
        var profileAfter = ctx.BrandProfiles.Single(p => p.BrandId == seed.BrandId).UpdatedAt;
        brandAfter.Should().BeAfter(brandBefore);
        profileAfter.Should().BeAfter(profileBefore);
    }
}
