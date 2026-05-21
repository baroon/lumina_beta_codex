using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class ConfirmDiscoveryCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Handle_ShouldThrowWhenBrandNotFound()
    {
        using var context = NewContext();
        var handler = new ConfirmDiscoveryCommandHandler(context);

        var command = new ConfirmDiscoveryCommand(Guid.NewGuid(), new List<Guid> { Guid.NewGuid() }, new List<Guid>());

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_ShouldConfirmAndDismissCandidates_WhenCompletionRequirementsMet()
    {
        using var context = NewContext();

        var brand = NewBrand();
        var product1 = NewProduct(brand.Id, "Product 1", 0.8);
        var product2 = NewProduct(brand.Id, "Product 2", 0.5);
        var market = NewMarket(brand.Id, "United States");
        var topic = NewTopic(brand.Id, "Pricing");
        var run = NewRun(brand.Id);

        context.Brands.Add(brand);
        context.Products.AddRange(product1, product2);
        context.Markets.Add(market);
        context.Topics.Add(topic);
        context.DiscoveryRuns.Add(run);
        await context.SaveChangesAsync();

        var handler = new ConfirmDiscoveryCommandHandler(context);
        var command = new ConfirmDiscoveryCommand(
            brand.Id,
            new List<Guid> { product1.Id, market.Id, topic.Id },
            new List<Guid> { product2.Id });

        await handler.Handle(command, CancellationToken.None);

        (await context.Products.FindAsync(product1.Id))!.Status.Should().Be(CandidateStatus.Confirmed);
        (await context.Products.FindAsync(product2.Id))!.Status.Should().Be(CandidateStatus.Dismissed);
        (await context.DiscoveryRuns.FindAsync(run.Id))!.Status.Should().Be(DiscoveryStatus.Completed);
    }

    [Fact]
    public async Task Handle_ShouldThrowValidation_WhenNoMarketConfirmed()
    {
        using var context = NewContext();
        var brand = NewBrand();
        var product = NewProduct(brand.Id, "Product", 0.8);
        var topic = NewTopic(brand.Id, "Pricing");

        context.Brands.Add(brand);
        context.Products.Add(product);
        context.Topics.Add(topic);
        context.DiscoveryRuns.Add(NewRun(brand.Id));
        await context.SaveChangesAsync();

        var handler = new ConfirmDiscoveryCommandHandler(context);
        var command = new ConfirmDiscoveryCommand(
            brand.Id,
            new List<Guid> { product.Id, topic.Id },
            new List<Guid>());

        var act = () => handler.Handle(command, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>())
            .Which.Message.Should().Contain("market");
    }

    [Fact]
    public async Task Handle_ShouldThrowValidation_WhenNoTopicConfirmed()
    {
        using var context = NewContext();
        var brand = NewBrand();
        var product = NewProduct(brand.Id, "Product", 0.8);
        var market = NewMarket(brand.Id, "United States");

        context.Brands.Add(brand);
        context.Products.Add(product);
        context.Markets.Add(market);
        context.DiscoveryRuns.Add(NewRun(brand.Id));
        await context.SaveChangesAsync();

        var handler = new ConfirmDiscoveryCommandHandler(context);
        var command = new ConfirmDiscoveryCommand(
            brand.Id,
            new List<Guid> { product.Id, market.Id },
            new List<Guid>());

        var act = () => handler.Handle(command, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>())
            .Which.Message.Should().Contain("topic");
    }

    [Fact]
    public async Task Handle_ShouldThrowValidation_WhenNoProductAndNoCategory()
    {
        using var context = NewContext();
        var brand = NewBrand();
        var market = NewMarket(brand.Id, "United States");
        var topic = NewTopic(brand.Id, "Pricing");

        context.Brands.Add(brand);
        context.Markets.Add(market);
        context.Topics.Add(topic);
        context.DiscoveryRuns.Add(NewRun(brand.Id));
        await context.SaveChangesAsync();

        var handler = new ConfirmDiscoveryCommandHandler(context);
        var command = new ConfirmDiscoveryCommand(
            brand.Id,
            new List<Guid> { market.Id, topic.Id },
            new List<Guid>());

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task Handle_ShouldSucceed_WithCategoryInsteadOfProduct()
    {
        using var context = NewContext();
        var brand = NewBrand();
        brand.BrandProfile = new BrandProfile
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Category = "Career Tools",
            Source = CandidateSource.LLMSuggested,
            Status = CandidateStatus.Suggested,
            Confidence = 0.9
        };
        var market = NewMarket(brand.Id, "United States");
        var topic = NewTopic(brand.Id, "Pricing");

        context.Brands.Add(brand);
        context.Markets.Add(market);
        context.Topics.Add(topic);
        context.DiscoveryRuns.Add(NewRun(brand.Id));
        await context.SaveChangesAsync();

        var handler = new ConfirmDiscoveryCommandHandler(context);
        var command = new ConfirmDiscoveryCommand(
            brand.Id,
            new List<Guid> { market.Id, topic.Id },
            new List<Guid>());

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    // ---- Helpers ----

    private static Brand NewBrand() => new()
    {
        Id = Guid.NewGuid(),
        Name = "Test",
        WebsiteUrl = "https://test.com",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    private static Product NewProduct(Guid brandId, string name, double confidence) => new()
    {
        Id = Guid.NewGuid(),
        BrandId = brandId,
        Name = name,
        Status = CandidateStatus.Suggested,
        Source = CandidateSource.WebsiteCrawl,
        Confidence = confidence
    };

    private static Market NewMarket(Guid brandId, string name) => new()
    {
        Id = Guid.NewGuid(),
        BrandId = brandId,
        Name = name,
        LanguageCode = "en",
        Status = CandidateStatus.Suggested,
        Source = CandidateSource.LLMSuggested,
        Confidence = 0.9
    };

    private static Topic NewTopic(Guid brandId, string name) => new()
    {
        Id = Guid.NewGuid(),
        BrandId = brandId,
        Name = name,
        Status = CandidateStatus.Suggested,
        Source = CandidateSource.LLMSuggested,
        Confidence = 0.9
    };

    private static DiscoveryRun NewRun(Guid brandId) => new()
    {
        Id = Guid.NewGuid(),
        BrandId = brandId,
        Status = DiscoveryStatus.AwaitingConfirmation,
        StartedAt = DateTime.UtcNow
    };
}
