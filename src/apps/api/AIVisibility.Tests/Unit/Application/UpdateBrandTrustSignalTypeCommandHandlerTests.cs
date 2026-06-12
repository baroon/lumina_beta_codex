using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Trust-signal categorization is enum-bounded — invalid values are
/// rejected at the controller before reaching the handler, so the
/// handler tests only need to cover persistence, the no-op case
/// (same value), and per-brand ownership.
/// </summary>
public class UpdateBrandTrustSignalTypeCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid TrustSignalId, Guid OtherBrandTrustSignalId);

    private static Seed Build(AppDbContext ctx, TrustSignalType initial = TrustSignalType.AwardsAndRecognitions)
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
            Name = "Inc. 5000", SignalType = initial,
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
    public async Task PersistsTheNewType()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new UpdateBrandTrustSignalTypeCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalTypeCommand(seed.BrandId, seed.TrustSignalId,
                TrustSignalType.CertificationsAndAccreditations),
            CancellationToken.None);

        result.SignalType.Should().Be(TrustSignalType.CertificationsAndAccreditations);
        ctx.TrustSignals.Single(ts => ts.Id == seed.TrustSignalId).SignalType
            .Should().Be(TrustSignalType.CertificationsAndAccreditations);
    }

    [Fact]
    public async Task SettingSameType_IsANoOp()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initial: TrustSignalType.PressAndMediaMentions);

        var result = await new UpdateBrandTrustSignalTypeCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalTypeCommand(seed.BrandId, seed.TrustSignalId,
                TrustSignalType.PressAndMediaMentions),
            CancellationToken.None);

        result.SignalType.Should().Be(TrustSignalType.PressAndMediaMentions);
    }

    [Fact]
    public async Task Throws_WhenTrustSignalDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandTrustSignalTypeCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalTypeCommand(seed.BrandId, Guid.NewGuid(),
                TrustSignalType.CertificationsAndAccreditations),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossBrandOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new UpdateBrandTrustSignalTypeCommandHandler(ctx).Handle(
            new UpdateBrandTrustSignalTypeCommand(seed.BrandId, seed.OtherBrandTrustSignalId,
                TrustSignalType.CertificationsAndAccreditations),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }
}
