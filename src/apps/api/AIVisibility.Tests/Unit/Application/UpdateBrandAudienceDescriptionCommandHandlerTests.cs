using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Mirrors <see cref="UpdateBrandCompetitorDescriptionCommandHandlerTests"/>:
/// description is a user-facing note, trim + null-coerce + cap.
/// Audience is the last dimension without a description edit surface,
/// so this closes the parity gap across the six dimensions.
/// </summary>
public class UpdateBrandAudienceDescriptionCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid AudienceId, Guid OtherBrandAudienceId);

    private static Seed Build(AppDbContext ctx, string? initialDescription = null)
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
        var audience = new Audience
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Job seekers", Description = initialDescription,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var otherAudience = new Audience
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id, DiscoveryRunId = otherRun.Id,
            Name = "Foreign Audience",
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(run);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.Audiences.Add(audience);
        ctx.Audiences.Add(otherAudience);
        ctx.SaveChanges();
        return new Seed(brand.Id, otherBrand.Id, audience.Id, otherAudience.Id);
    }

    [Fact]
    public async Task TrimsWhitespace_AndPersists()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandAudienceDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandAudienceDescriptionCommand(seed.BrandId, seed.AudienceId,
                "  Mid-career professionals.  "),
            CancellationToken.None);

        result.Description.Should().Be("Mid-career professionals.");
        ctx.Audiences.Single(a => a.Id == seed.AudienceId).Description
            .Should().Be("Mid-career professionals.");
    }

    [Fact]
    public async Task NullOrWhitespace_ClearsDescription()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialDescription: "Existing note.");

        var result = await new UpdateBrandAudienceDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandAudienceDescriptionCommand(seed.BrandId, seed.AudienceId, "   "),
            CancellationToken.None);

        result.Description.Should().BeNull();
        ctx.Audiences.Single(a => a.Id == seed.AudienceId).Description.Should().BeNull();
    }

    [Fact]
    public async Task Rejects_DescriptionOverMaxLength()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandAudienceDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandAudienceDescriptionCommand(seed.BrandId, seed.AudienceId,
                new string('x', 2001)),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*2000 characters or fewer*");
    }

    [Fact]
    public async Task Throws_WhenAudienceDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandAudienceDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandAudienceDescriptionCommand(seed.BrandId, Guid.NewGuid(), "Hello"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandAudienceDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandAudienceDescriptionCommand(seed.BrandId,
                seed.OtherBrandAudienceId, "Hello"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
