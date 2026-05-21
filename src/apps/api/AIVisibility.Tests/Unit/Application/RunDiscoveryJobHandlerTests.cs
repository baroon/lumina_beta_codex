using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Application;

public class RunDiscoveryJobHandlerTests
{
    private readonly Mock<IWebsiteDiscoveryService> _crawl = new();
    private readonly Mock<IContentExtractor> _extractor = new();
    private readonly Mock<IDiscoveryProgressNotifier> _notifier = new();

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private RunDiscoveryJobHandler CreateHandler(AppDbContext ctx) =>
        new(ctx, _crawl.Object, _extractor.Object, _notifier.Object,
            new Mock<ILogger<RunDiscoveryJobHandler>>().Object);

    private static (Brand brand, DiscoveryRun run) Seed(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Status = DiscoveryStatus.Pending,
            StartedAt = DateTime.UtcNow
        };
        ctx.Brands.Add(brand);
        ctx.DiscoveryRuns.Add(run);
        ctx.SaveChanges();
        return (brand, run);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowWhenRunNotFound()
    {
        using var ctx = NewContext();
        var handler = CreateHandler(ctx);

        var act = () => handler.ExecuteAsync(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldPersistCandidatesAndAwaitConfirmation_OnSuccess()
    {
        using var ctx = NewContext();
        var (brand, run) = Seed(ctx);

        var page = new CrawledPage { Id = Guid.NewGuid(), Url = "https://test.com/", StatusCode = 200 };
        _crawl.Setup(c => c.CrawlWebsiteAsync(brand.WebsiteUrl, run.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrawlResult(new List<CrawledPage> { page }, 1));

        _extractor.Setup(e => e.ExtractCandidatesAsync(It.IsAny<Brand>(), It.IsAny<List<CrawledPage>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExtractionResult(
                new BrandProfile { Id = Guid.NewGuid(), ShortDescription = "desc", Source = CandidateSource.WebsiteCrawl, Status = CandidateStatus.Suggested, Confidence = 0.7 },
                new List<Product> { new() { Id = Guid.NewGuid(), Name = "Product A", Source = CandidateSource.WebsiteCrawl, Status = CandidateStatus.Suggested, Confidence = 0.7 } },
                new List<Audience>(),
                new List<Market> { new() { Id = Guid.NewGuid(), Name = "Global", MarketType = MarketType.Global, Source = CandidateSource.WebsiteCrawl, Status = CandidateStatus.Suggested, Confidence = 0.4 } },
                new List<Topic>(),
                new List<TrustSignal>()));

        var handler = CreateHandler(ctx);
        await handler.ExecuteAsync(brand.Id, run.Id, CancellationToken.None);

        run.Status.Should().Be(DiscoveryStatus.AwaitingConfirmation);
        run.CompletedAt.Should().NotBeNull();
        run.PagesCrawled.Should().Be(1);

        var product = await ctx.Products.SingleAsync();
        product.BrandId.Should().Be(brand.Id);
        product.DiscoveryRunId.Should().Be(run.Id);

        (await ctx.BrandProfiles.SingleAsync()).BrandId.Should().Be(brand.Id);
        (await ctx.CrawledPages.SingleAsync()).DiscoveryRunId.Should().Be(run.Id);

        _notifier.Verify(n => n.NotifyProgressAsync(brand.Id, DiscoveryStatus.AwaitingConfirmation,
            It.IsAny<int>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldMarkFailed_WhenCrawlThrows()
    {
        using var ctx = NewContext();
        var (brand, run) = Seed(ctx);

        _crawl.Setup(c => c.CrawlWebsiteAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("crawl boom"));

        var handler = CreateHandler(ctx);
        await handler.ExecuteAsync(brand.Id, run.Id, CancellationToken.None);

        run.Status.Should().Be(DiscoveryStatus.Failed);
        run.Error.Should().Be("crawl boom");
        run.CompletedAt.Should().NotBeNull();
        _notifier.Verify(n => n.NotifyProgressAsync(brand.Id, DiscoveryStatus.Failed,
            It.IsAny<int>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
