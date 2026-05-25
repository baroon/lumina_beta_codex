using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Discovery;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class ConfirmDiscoveryCommandHandlerTests
{
    private sealed class FakeDraftStore : IDiscoveryDraftStore
    {
        private readonly Dictionary<Guid, DiscoveryResultsDto> _drafts = new();
        public void Save(Guid id, DiscoveryResultsDto draft) => _drafts[id] = draft;
        public DiscoveryResultsDto? Get(Guid id) => _drafts.TryGetValue(id, out var d) ? d : null;
        public void Remove(Guid id) => _drafts.Remove(id);
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static ConfirmCandidateInput Item(string name, Dictionary<string, string>? metadata = null) =>
        new(name, null, 0.9, "LLMSuggested", metadata);

    private static (Brand brand, DiscoveryRun run) Seed(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            WebsiteUrl = "https://test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Status = DiscoveryStatus.AwaitingConfirmation,
            StartedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.DiscoveryRuns.Add(run);
        ctx.SaveChanges();
        return (brand, run);
    }

    private static ConfirmDiscoveryCommand Command(
        Guid brandId,
        ConfirmBrandProfileInput? profile = null,
        List<ConfirmCandidateInput>? products = null,
        List<ConfirmCandidateInput>? markets = null,
        List<ConfirmCandidateInput>? topics = null,
        List<ConfirmCandidateInput>? competitors = null,
        List<ConfirmCandidateInput>? trustSignals = null,
        List<string>? aliases = null) =>
        new(brandId, profile, products ?? new(), new(), markets ?? new(),
            topics ?? new(), competitors ?? new(), trustSignals ?? new(), aliases);

    [Fact]
    public async Task Handle_ShouldThrowWhenBrandNotFound()
    {
        using var ctx = NewContext();
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var act = () => handler.Handle(Command(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_ShouldPersistConfirmedRowsAndCompleteRun()
    {
        using var ctx = NewContext();
        var (brand, run) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(
            brand.Id,
            profile: new ConfirmBrandProfileInput("A SaaS tool", "Tech", "SaaS", "Leader", 0.9, "LLMSuggested"),
            products: new() { Item("Analytics", new() { ["productType"] = "Service" }) },
            markets: new() { Item("United States") },
            topics: new() { Item("Pricing") },
            competitors: new() { Item("Acme", new() { ["domain"] = "acme.com" }) },
            trustSignals: new() { Item("SOC2", new() { ["signalType"] = "CertificationsAndAccreditations" }) });

        await handler.Handle(command, CancellationToken.None);

        var product = await ctx.Products.SingleAsync();
        product.Name.Should().Be("Analytics");
        product.ProductType.Should().Be(ProductType.Service);
        product.BrandId.Should().Be(brand.Id);
        product.DiscoveryRunId.Should().Be(run.Id);

        (await ctx.Markets.SingleAsync()).Name.Should().Be("United States");
        (await ctx.Topics.SingleAsync()).Name.Should().Be("Pricing");
        (await ctx.Competitors.SingleAsync()).Domain.Should().Be("acme.com");
        (await ctx.TrustSignals.SingleAsync()).SignalType.Should().Be(TrustSignalType.CertificationsAndAccreditations);
        (await ctx.BrandProfiles.SingleAsync()).Category.Should().Be("SaaS");
        (await ctx.DiscoveryRuns.FindAsync(run.Id))!.Status.Should().Be(DiscoveryStatus.Completed);
    }

    [Fact]
    public async Task Handle_ShouldBeIdempotent_WhenConfirmedTwice()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(
            brand.Id,
            profile: new ConfirmBrandProfileInput("A SaaS tool", "Tech", "SaaS", "Leader", 0.9, "LLMSuggested"),
            products: new() { Item("Analytics", new() { ["productType"] = "Service" }) },
            markets: new() { Item("United States") },
            topics: new() { Item("Pricing") });

        await handler.Handle(command, CancellationToken.None);
        await handler.Handle(command, CancellationToken.None); // re-confirm must not duplicate

        (await ctx.BrandProfiles.CountAsync(b => b.BrandId == brand.Id)).Should().Be(1);
        (await ctx.Products.CountAsync(p => p.BrandId == brand.Id)).Should().Be(1);
        (await ctx.Topics.CountAsync(t => t.BrandId == brand.Id)).Should().Be(1);
        (await ctx.Markets.CountAsync(m => m.BrandId == brand.Id)).Should().Be(1);
    }

    [Fact]
    public async Task Handle_ShouldClearDraft_SoResultsReportTheCompletedRun()
    {
        using var ctx = NewContext();
        var (brand, run) = Seed(ctx);
        var draftStore = new FakeDraftStore();
        draftStore.Save(run.Id, new DiscoveryResultsDto(
            brand.Id, brand.Name, "AwaitingConfirmation", null,
            new List<CandidateDto>(), new List<CandidateDto>(), new List<CandidateDto>(),
            new List<CandidateDto>(), new List<CandidateDto>(), new List<CandidateDto>(),
            new List<string>()));
        var handler = new ConfirmDiscoveryCommandHandler(ctx, draftStore);

        await handler.Handle(
            Command(
                brand.Id,
                products: new() { Item("Analytics", new() { ["productType"] = "Service" }) },
                markets: new() { Item("US") },
                topics: new() { Item("Pricing") }),
            CancellationToken.None);

        // Draft gone → GetDiscoveryResults falls through to the completed run status.
        draftStore.Get(run.Id).Should().BeNull();
    }

    [Fact]
    public async Task Handle_ShouldPersistBrandAliases_TrimmedAndDeduped()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(
            brand.Id,
            products: new() { Item("Analytics", new() { ["productType"] = "Service" }) },
            markets: new() { Item("United States") },
            topics: new() { Item("Pricing") },
            aliases: new() { "Lumina", "  Lumina  ", "Lumina AI", "" });

        await handler.Handle(command, CancellationToken.None);

        var saved = await ctx.Brands.FindAsync(brand.Id);
        saved!.Aliases.Should().BeEquivalentTo(new[] { "Lumina", "Lumina AI" });
    }

    [Fact]
    public async Task Handle_ShouldThrowValidation_WhenNoMarket()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(brand.Id, products: new() { Item("P") }, topics: new() { Item("T") });
        var act = () => handler.Handle(command, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Message.Should().Contain("market");
    }

    [Fact]
    public async Task Handle_ShouldThrowValidation_WhenNoTopic()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(brand.Id, products: new() { Item("P") }, markets: new() { Item("US") });
        var act = () => handler.Handle(command, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Message.Should().Contain("topic");
    }

    [Fact]
    public async Task Handle_ShouldThrowValidation_WhenNoProductAndNoCategory()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(brand.Id, markets: new() { Item("US") }, topics: new() { Item("T") });
        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task Handle_ShouldSucceed_WithCategoryInsteadOfProduct()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(
            brand.Id,
            profile: new ConfirmBrandProfileInput(null, null, "Career Tools", null, 0.9, "LLMSuggested"),
            markets: new() { Item("US") },
            topics: new() { Item("T") });
        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Handle_ShouldThrowValidation_WhenProductHasNoType()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(
            brand.Id,
            products: new() { Item("Analytics") },
            markets: new() { Item("US") },
            topics: new() { Item("Pricing") });
        var act = () => handler.Handle(command, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Message.Should().Contain("type");
    }

    [Fact]
    public async Task Handle_ShouldThrowValidation_WhenTrustSignalHasNoType()
    {
        using var ctx = NewContext();
        var (brand, _) = Seed(ctx);
        var handler = new ConfirmDiscoveryCommandHandler(ctx, new FakeDraftStore());

        var command = Command(
            brand.Id,
            products: new() { Item("Analytics", new() { ["productType"] = "Service" }) },
            markets: new() { Item("US") },
            topics: new() { Item("Pricing") },
            trustSignals: new() { Item("SOC2") });
        var act = () => handler.Handle(command, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Message.Should().Contain("type");
    }
}
