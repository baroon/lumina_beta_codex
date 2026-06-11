using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Covers Add + Remove for brand-level Topic chips. Add anchors the
/// new row to the brand's most recent DiscoveryRun so the NOT NULL FK
/// stays satisfied without making the column nullable; Remove asserts
/// the per-brand ownership check so a stale FE can't delete topics
/// across brands by guessing IDs.
/// </summary>
public class BrandTopicHandlersTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId,
        Guid OlderRunId, Guid NewerRunId,
        Guid ExistingTopicId, Guid OtherBrandTopicId);

    /// <summary>
    /// Two brands. Primary brand has two DiscoveryRuns (older + newer)
    /// and one existing topic anchored to the older run. The other
    /// brand has one DiscoveryRun and one topic — used for the
    /// cross-brand ownership-check tests.
    /// </summary>
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
        var existing = new Topic
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            DiscoveryRunId = olderRun.Id,
            Name = "Resume builders",
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
        };
        var otherTopic = new Topic
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id,
            DiscoveryRunId = otherRun.Id,
            Name = "Photo editing",
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
        };

        ctx.Brands.Add(brand);
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(olderRun);
        ctx.DiscoveryRuns.Add(newerRun);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.Topics.Add(existing);
        ctx.Topics.Add(otherTopic);
        ctx.SaveChanges();
        return new Seed(brand.Id, otherBrand.Id, olderRun.Id, newerRun.Id, existing.Id, otherTopic.Id);
    }

    // -----------------------------------------------------------------------
    // Add
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Add_PersistsTopic_AnchoredToLatestDiscoveryRun_WithUserAddedSource()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new AddBrandTopicCommandHandler(ctx).Handle(
            new AddBrandTopicCommand(seed.BrandId, "Career change"),
            CancellationToken.None);

        var persisted = ctx.Topics.Single(t => t.Id == result.TopicId);
        persisted.Name.Should().Be("Career change");
        persisted.Source.Should().Be(CandidateSource.UserAdded);
        persisted.Confidence.Should().Be(1.0);
        // Newer run wins — the manual add is a continuation of the latest snapshot.
        persisted.DiscoveryRunId.Should().Be(seed.NewerRunId);
    }

    [Fact]
    public async Task Add_TrimsName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new AddBrandTopicCommandHandler(ctx).Handle(
            new AddBrandTopicCommand(seed.BrandId, "  Career change  "),
            CancellationToken.None);

        result.Name.Should().Be("Career change");
    }

    [Fact]
    public async Task Add_Throws_WhenNameIsWhitespaceOrEmpty()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var handler = new AddBrandTopicCommandHandler(ctx);

        Func<Task> empty = () => handler.Handle(
            new AddBrandTopicCommand(seed.BrandId, ""), CancellationToken.None);
        Func<Task> whitespace = () => handler.Handle(
            new AddBrandTopicCommand(seed.BrandId, "   "), CancellationToken.None);

        await empty.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
        await whitespace.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
    }

    [Fact]
    public async Task Add_Throws_WhenDuplicateNameExistsOnSameBrand_CaseInsensitive()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new AddBrandTopicCommandHandler(ctx).Handle(
            new AddBrandTopicCommand(seed.BrandId, "resume BUILDERS"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task Add_AllowsDuplicateName_AcrossDifferentBrands()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // "Photo editing" exists on the other brand but not on this one.
        var result = await new AddBrandTopicCommandHandler(ctx).Handle(
            new AddBrandTopicCommand(seed.BrandId, "Photo editing"),
            CancellationToken.None);

        result.Name.Should().Be("Photo editing");
    }

    [Fact]
    public async Task Add_Throws_WhenBrandNotFound()
    {
        using var ctx = NewContext();
        Build(ctx);

        Func<Task> act = () => new AddBrandTopicCommandHandler(ctx).Handle(
            new AddBrandTopicCommand(Guid.NewGuid(), "X"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    // -----------------------------------------------------------------------
    // Remove
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Remove_DeletesTopic_WhenIdBelongsToBrand()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        await new RemoveBrandTopicCommandHandler(ctx).Handle(
            new RemoveBrandTopicCommand(seed.BrandId, seed.ExistingTopicId),
            CancellationToken.None);

        ctx.Topics.Any(t => t.Id == seed.ExistingTopicId).Should().BeFalse();
    }

    [Fact]
    public async Task Remove_Throws_WhenTopicBelongsToDifferentBrand()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // The other brand's topic is targeted with our brand's ID — the
        // handler must refuse rather than silently delete cross-brand.
        Func<Task> act = () => new RemoveBrandTopicCommandHandler(ctx).Handle(
            new RemoveBrandTopicCommand(seed.BrandId, seed.OtherBrandTopicId),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*does not belong*");
        ctx.Topics.Any(t => t.Id == seed.OtherBrandTopicId).Should().BeTrue();
    }

    [Fact]
    public async Task Remove_Throws_WhenTopicNotFound()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new RemoveBrandTopicCommandHandler(ctx).Handle(
            new RemoveBrandTopicCommand(seed.BrandId, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }
}
