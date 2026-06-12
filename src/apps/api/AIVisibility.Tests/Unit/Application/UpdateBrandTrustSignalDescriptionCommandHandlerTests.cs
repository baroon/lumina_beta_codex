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
/// </summary>
public class UpdateBrandTrustSignalDescriptionCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid TrustSignalId, Guid OtherBrandTrustSignalId);

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
        var signal = new TrustSignal
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Inc. 5000", SignalType = TrustSignalType.AwardsAndRecognitions,
            Description = initialDescription,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var otherSignal = new TrustSignal
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id, DiscoveryRunId = otherRun.Id,
            Name = "Foreign Award", SignalType = TrustSignalType.AwardsAndRecognitions,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(run);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.TrustSignals.Add(signal);
        ctx.TrustSignals.Add(otherSignal);
        ctx.SaveChanges();
        return new Seed(brand.Id, otherBrand.Id, signal.Id, otherSignal.Id);
    }

    [Fact]
    public async Task TrimsWhitespace_AndPersists()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandTrustSignalDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalDescriptionCommand(seed.BrandId, seed.TrustSignalId,
                "  Fastest-growing companies list.  "),
            CancellationToken.None);

        result.Description.Should().Be("Fastest-growing companies list.");
        ctx.TrustSignals.Single(ts => ts.Id == seed.TrustSignalId).Description
            .Should().Be("Fastest-growing companies list.");
    }

    [Fact]
    public async Task NullOrWhitespace_ClearsDescription()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initialDescription: "Existing note.");

        var result = await new UpdateBrandTrustSignalDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalDescriptionCommand(seed.BrandId, seed.TrustSignalId, "   "),
            CancellationToken.None);

        result.Description.Should().BeNull();
        ctx.TrustSignals.Single(ts => ts.Id == seed.TrustSignalId).Description.Should().BeNull();
    }

    [Fact]
    public async Task Rejects_DescriptionOverMaxLength()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandTrustSignalDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalDescriptionCommand(seed.BrandId, seed.TrustSignalId,
                new string('x', 2001)),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*2000 characters or fewer*");
    }

    [Fact]
    public async Task Throws_WhenTrustSignalDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandTrustSignalDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalDescriptionCommand(seed.BrandId, Guid.NewGuid(), "Hello"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandTrustSignalDescriptionCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalDescriptionCommand(seed.BrandId,
                seed.OtherBrandTrustSignalId, "Hello"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
