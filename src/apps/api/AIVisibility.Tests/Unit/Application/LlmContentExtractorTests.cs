using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Crawling;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Application;

public class LlmContentExtractorTests
{
    private readonly Mock<IOpenAiService> _openAi = new();
    private readonly Mock<IBlobStorageService> _blob = new();
    private readonly Mock<IDiscoveryProgressNotifier> _notifier = new();

    private LlmContentExtractor CreateExtractor() =>
        new(new HeuristicContentExtractor(), _openAi.Object, _blob.Object, _notifier.Object,
            new Mock<ILogger<LlmContentExtractor>>().Object);

    private static Brand NewBrand() => new()
    {
        Id = Guid.NewGuid(),
        Name = "Example",
        WebsiteUrl = "https://example.com"
    };

    [Fact]
    public async Task ExtractCandidatesAsync_MapsLlmResponses_OnSuccess()
    {
        var pages = new List<CrawledPage>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/",
                Title = "Example",
                MetaDescription = "Example builds software",
                HeadingsJson = "[]",
                ExtractedTextBlobRef = "blob1",
                StatusCode = 200
            }
        };

        _blob.Setup(b => b.DownloadTextAsync("crawled-pages", "blob1", It.IsAny<CancellationToken>()))
            .ReturnsAsync("Example is a marketing analytics platform.");

        _openAi.Setup(o => o.ChatCompletionAsync(
            It.Is<string>(s => s.Contains("brand analyst")),
            It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("{\"description\":\"A marketing analytics SaaS platform.\",\"industry\":\"Technology\",\"category\":\"SaaS\",\"positioning\":\"Leader\",\"confidence\":90}");

        _openAi.Setup(o => o.ChatCompletionAsync(
            It.Is<string>(s => s.Contains("business analyst")),
            It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("{\"products\":[{\"name\":\"Analytics\",\"type\":\"Product\",\"confidence\":80}],\"audiences\":[{\"name\":\"Marketers\",\"confidence\":75}],\"markets\":[{\"name\":\"United States\",\"type\":\"Country\",\"countryCode\":\"US\",\"confidence\":70}],\"trustSignals\":[{\"name\":\"SOC2\",\"type\":\"CertificationsAndAccreditations\",\"confidence\":85}]}");

        var result = await CreateExtractor().ExtractCandidatesAsync(NewBrand(), pages);

        result.BrandProfile.Should().NotBeNull();
        result.BrandProfile!.Source.Should().Be(CandidateSource.LLMSuggested);
        result.BrandProfile.Industry.Should().Be("Technology");
        result.BrandProfile.Confidence.Should().Be(0.9);
        result.Products.Should().ContainSingle(p => p.Name == "Analytics" && p.ProductType == ProductType.Product);
        result.Audiences.Should().ContainSingle(a => a.Name == "Marketers");
        result.Markets.Should().ContainSingle(m => m.Name == "United States" && m.MarketType == MarketType.Country);
        result.TrustSignals.Should().ContainSingle(t => t.SignalType == TrustSignalType.CertificationsAndAccreditations);
        result.Topics.Should().BeEmpty();
    }

    [Fact]
    public async Task ExtractCandidatesAsync_FallsBackToHeuristic_OnBlankLlmResponses()
    {
        var pages = new List<CrawledPage>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/",
                Title = "Example",
                MetaDescription = "Example builds software for marketing teams",
                HeadingsJson = "[]",
                StatusCode = 200
            }
        };

        _openAi.Setup(o => o.ChatCompletionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");

        var result = await CreateExtractor().ExtractCandidatesAsync(NewBrand(), pages);

        // Blank LLM responses → fall back to the heuristic baseline.
        result.BrandProfile.Should().NotBeNull();
        result.BrandProfile!.Source.Should().Be(CandidateSource.WebsiteCrawl);
        result.BrandProfile.ShortDescription.Should().Be("Example builds software for marketing teams");
        result.Markets.Should().NotBeEmpty();
        result.Topics.Should().BeEmpty();
    }
}
