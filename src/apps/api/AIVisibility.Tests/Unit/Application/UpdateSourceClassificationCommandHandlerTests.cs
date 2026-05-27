using AIVisibility.Application.Commands.Sources;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// UpdateSourceClassificationCommandHandler tests. User-correction flow for
/// the Source/Citation view (Phase 4 v1 plan §D11/D20). Verifies the row
/// flips to UserCorrected provenance + status, that idempotency holds, and
/// that 404 is returned when the (brand, source) pair has no row.
/// </summary>
public class UpdateSourceClassificationCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static (Guid BrandId, Guid SourceId, Guid ClassificationId) Seed(
        AppDbContext ctx,
        SourceType initialType = SourceType.Unknown,
        ClassificationSource initialProvenance = ClassificationSource.LLMClassified)
    {
        var brandId = Guid.NewGuid();
        var sourceId = Guid.NewGuid();
        var classification = new BrandSourceClassification
        {
            Id = Guid.NewGuid(),
            BrandId = brandId,
            SourceId = sourceId,
            SourceType = initialType,
            ConfidenceScore = 0.6,
            ProvenanceSource = initialProvenance,
            Status = ClassificationStatus.Active,
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            UpdatedAt = DateTime.UtcNow.AddMinutes(-5),
        };
        ctx.BrandSourceClassifications.Add(classification);
        ctx.SaveChanges();
        return (brandId, sourceId, classification.Id);
    }

    [Fact]
    public async Task ReturnsNull_When_BrandSourcePair_HasNoExistingClassification()
    {
        // 404 path: user trying to correct a classification that doesn't
        // exist for this brand (probably stale UI state).
        using var ctx = NewContext();
        var sut = new UpdateSourceClassificationCommandHandler(ctx);

        var result = await sut.Handle(
            new UpdateSourceClassificationCommand(Guid.NewGuid(), Guid.NewGuid(), SourceType.Editorial),
            CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task PromotesRowToUserCorrected_WithFullConfidence()
    {
        using var ctx = NewContext();
        var seed = Seed(ctx, initialType: SourceType.Unknown, initialProvenance: ClassificationSource.LLMClassified);
        var sut = new UpdateSourceClassificationCommandHandler(ctx);

        var result = await sut.Handle(
            new UpdateSourceClassificationCommand(seed.SourceId, seed.BrandId, SourceType.Editorial),
            CancellationToken.None);

        result.Should().NotBeNull();
        result!.SourceType.Should().Be("Editorial");
        result.ProvenanceSource.Should().Be("UserCorrected");
        result.Status.Should().Be("UserCorrected");
        result.ConfidenceScore.Should().Be(1.0); // user verdict = ground truth

        // Reload to confirm the write actually persisted.
        var reloaded = await ctx.BrandSourceClassifications.AsNoTracking()
            .SingleAsync(c => c.Id == seed.ClassificationId);
        reloaded.SourceType.Should().Be(SourceType.Editorial);
        reloaded.ProvenanceSource.Should().Be(ClassificationSource.UserCorrected);
    }

    [Fact]
    public async Task IsIdempotent_OverwritesUserCorrectedTypeWithoutErroring()
    {
        // User changes their mind: Editorial → ReviewSite. Both calls succeed,
        // second call ends at ReviewSite/UserCorrected.
        using var ctx = NewContext();
        var seed = Seed(ctx);
        var sut = new UpdateSourceClassificationCommandHandler(ctx);

        await sut.Handle(new UpdateSourceClassificationCommand(seed.SourceId, seed.BrandId, SourceType.Editorial), CancellationToken.None);
        var second = await sut.Handle(
            new UpdateSourceClassificationCommand(seed.SourceId, seed.BrandId, SourceType.ReviewSite),
            CancellationToken.None);

        second.Should().NotBeNull();
        second!.SourceType.Should().Be("ReviewSite");
        second.ProvenanceSource.Should().Be("UserCorrected");

        var reloaded = await ctx.BrandSourceClassifications.AsNoTracking()
            .SingleAsync(c => c.Id == seed.ClassificationId);
        reloaded.SourceType.Should().Be(SourceType.ReviewSite);
    }

    [Fact]
    public async Task OverridesRuleBasedClassification()
    {
        // The user correction must win even when the existing classification
        // was RuleBased (Owned/Competitor — the high-confidence rules).
        using var ctx = NewContext();
        var seed = Seed(ctx, initialType: SourceType.Owned, initialProvenance: ClassificationSource.RuleBased);
        var sut = new UpdateSourceClassificationCommandHandler(ctx);

        var result = await sut.Handle(
            new UpdateSourceClassificationCommand(seed.SourceId, seed.BrandId, SourceType.Competitor),
            CancellationToken.None);

        result.Should().NotBeNull();
        result!.SourceType.Should().Be("Competitor");
        result.ProvenanceSource.Should().Be("UserCorrected");
    }
}
