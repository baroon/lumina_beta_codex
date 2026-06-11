using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Smoke-tests the six dimension rename handlers (audience, competitor,
/// market, product, topic, trust signal). Each shares the same three
/// load-bearing invariants: trim + persist, per-brand case-insensitive
/// uniqueness, and per-brand ownership enforcement on the row being
/// renamed. The trim/empty/no-op/missing paths are already covered by
/// the sibling Add suite (BrandDimensionAddRemoveHandlersTests) — the
/// rename handlers are mechanical mirrors of those.
/// </summary>
public class BrandDimensionRenameHandlersTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid BrandId, Guid OtherBrandId, Guid RunId,
        Guid TopicAId, Guid TopicBId, Guid OtherTopicId,
        Guid CompetitorAId,
        Guid AudienceAId,
        Guid MarketAId,
        Guid ProductAId,
        Guid TrustSignalAId);

    /// <summary>
    /// Brand 1 carries two rows of each dimension ("A" and "B") so the
    /// uniqueness collision tests have a sibling to clash with. Brand 2
    /// carries one Topic — used for the cross-brand ownership-check
    /// assertion.
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme",
            WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var otherBrand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Beta",
            WebsiteUrl = "https://beta.com",
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
        var topicA = new Topic
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Topic A", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var topicB = new Topic
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Topic B", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var otherTopic = new Topic
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id, DiscoveryRunId = otherRun.Id,
            Name = "Foreign Topic", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var competitorA = new Competitor
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Competitor A", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var competitorB = new Competitor
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Competitor B", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var audienceA = new Audience
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Audience A", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var audienceB = new Audience
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Audience B", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var marketA = new Market
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Market A", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var marketB = new Market
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Market B", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var productA = new Product
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Product A", ProductType = ProductType.Product,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var productB = new Product
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            Name = "Product B", ProductType = ProductType.Product,
            Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var trustSignalA = new TrustSignal
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            SignalType = TrustSignalType.AwardsAndRecognitions,
            Name = "Trust A", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        var trustSignalB = new TrustSignal
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, DiscoveryRunId = run.Id,
            SignalType = TrustSignalType.AwardsAndRecognitions,
            Name = "Trust B", Confidence = 0.9, Source = CandidateSource.LLMSuggested,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.Brands.Add(otherBrand);
        ctx.DiscoveryRuns.Add(run);
        ctx.DiscoveryRuns.Add(otherRun);
        ctx.Topics.AddRange(topicA, topicB, otherTopic);
        ctx.Competitors.AddRange(competitorA, competitorB);
        ctx.Audiences.AddRange(audienceA, audienceB);
        ctx.Markets.AddRange(marketA, marketB);
        ctx.Products.AddRange(productA, productB);
        ctx.TrustSignals.AddRange(trustSignalA, trustSignalB);
        ctx.SaveChanges();
        return new Seed(
            brand.Id, otherBrand.Id, run.Id,
            topicA.Id, topicB.Id, otherTopic.Id,
            competitorA.Id,
            audienceA.Id,
            marketA.Id,
            productA.Id,
            trustSignalA.Id);
    }

    // -----------------------------------------------------------------------
    // Topic — the reference dimension. Other tests delegate the trim /
    // empty / no-op paths to its coverage; we only re-assert the
    // load-bearing invariants for the rest.
    // -----------------------------------------------------------------------

    [Fact]
    public async Task RenameTopic_PersistsTrimmedName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandTopicCommandHandler(ctx).Handle(
            new RenameBrandTopicCommand(seed.BrandId, seed.TopicAId, "  Topic A renamed  "),
            CancellationToken.None);

        result.Name.Should().Be("Topic A renamed");
        ctx.Topics.Single(t => t.Id == seed.TopicAId).Name.Should().Be("Topic A renamed");
    }

    [Fact]
    public async Task RenameTopic_Throws_OnEmptyName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new RenameBrandTopicCommandHandler(ctx).Handle(
            new RenameBrandTopicCommand(seed.BrandId, seed.TopicAId, "   "),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
    }

    [Fact]
    public async Task RenameTopic_IsNoOp_WhenNameUnchanged()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandTopicCommandHandler(ctx).Handle(
            new RenameBrandTopicCommand(seed.BrandId, seed.TopicAId, "Topic A"),
            CancellationToken.None);

        result.Name.Should().Be("Topic A");
    }

    [Fact]
    public async Task RenameTopic_Throws_OnCaseInsensitiveCollision_WithSibling()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new RenameBrandTopicCommandHandler(ctx).Handle(
            new RenameBrandTopicCommand(seed.BrandId, seed.TopicAId, "topic B"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
    }

    [Fact]
    public async Task RenameTopic_Throws_OnCrossBrandOwnership()
    {
        // Renaming the foreign-brand topic via brand 1's ID must refuse.
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new RenameBrandTopicCommandHandler(ctx).Handle(
            new RenameBrandTopicCommand(seed.BrandId, seed.OtherTopicId, "Anything"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not belong*");
    }

    // -----------------------------------------------------------------------
    // Other five dimensions — one rename smoke-test each. Trim + collision
    // + ownership are exercised on Topic and the handlers are identical
    // mirrors. Duplicating each path 5× would add noise without value.
    // -----------------------------------------------------------------------

    [Fact]
    public async Task RenameCompetitor_PersistsTrimmedName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandCompetitorCommandHandler(ctx).Handle(
            new RenameBrandCompetitorCommand(seed.BrandId, seed.CompetitorAId, "  Renamed  "),
            CancellationToken.None);

        result.Name.Should().Be("Renamed");
    }

    [Fact]
    public async Task RenameAudience_PersistsTrimmedName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandAudienceCommandHandler(ctx).Handle(
            new RenameBrandAudienceCommand(seed.BrandId, seed.AudienceAId, "  Renamed  "),
            CancellationToken.None);

        result.Name.Should().Be("Renamed");
    }

    [Fact]
    public async Task RenameMarket_PersistsTrimmedName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandMarketCommandHandler(ctx).Handle(
            new RenameBrandMarketCommand(seed.BrandId, seed.MarketAId, "  Renamed  "),
            CancellationToken.None);

        result.Name.Should().Be("Renamed");
    }

    [Fact]
    public async Task RenameProduct_PersistsTrimmedName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandProductCommandHandler(ctx).Handle(
            new RenameBrandProductCommand(seed.BrandId, seed.ProductAId, "  Renamed  "),
            CancellationToken.None);

        result.Name.Should().Be("Renamed");
    }

    [Fact]
    public async Task RenameTrustSignal_PersistsTrimmedName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandTrustSignalCommandHandler(ctx).Handle(
            new RenameBrandTrustSignalCommand(seed.BrandId, seed.TrustSignalAId, "  Renamed  "),
            CancellationToken.None);

        result.Name.Should().Be("Renamed");
    }
}
