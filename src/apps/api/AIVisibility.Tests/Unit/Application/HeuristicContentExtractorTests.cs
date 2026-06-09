using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Crawling;
using FluentAssertions;

namespace AIVisibility.Tests.Unit.Application;

public class HeuristicContentExtractorTests
{
    private readonly HeuristicContentExtractor _extractor = new();

    [Fact]
    public async Task ExtractCandidates_ShouldExtractBrandProfile_FromHomepage()
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://example.com"
        };

        var pages = new List<CrawledPage>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/",
                Title = "Test Brand - Leading SaaS Platform",
                MetaDescription = "Test Brand is a leading software platform for marketing teams",
                Headings = new List<Heading>
                {
                    new("h1", "The All-in-One Marketing Platform"),
                    new("h2", "Analytics Dashboard"),
                    new("h2", "Campaign Manager"),
                },
            }
        };

        var result = await _extractor.ExtractCandidatesAsync(brand, pages);

        result.BrandProfile.Should().NotBeNull();
        result.BrandProfile!.ShortDescription.Should().Contain("software platform");
        result.BrandProfile.Industry.Should().Be("Technology");
        result.BrandProfile.Source.Should().Be(CandidateSource.WebsiteCrawl);
    }

    [Fact]
    public async Task ExtractCandidates_ShouldExtractProducts_FromProductPages()
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://example.com"
        };

        var pages = new List<CrawledPage>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/products",
                Title = "Our Products",
                Headings = new List<Heading>
                {
                    new("h1", "Our Products"),
                    new("h2", "Enterprise Analytics"),
                    new("h2", "Team Collaboration Suite"),
                    new("h3", "Real-time Reporting Engine"),
                },
            }
        };

        var result = await _extractor.ExtractCandidatesAsync(brand, pages);

        result.Products.Should().NotBeEmpty();
        result.Products.Should().Contain(p => p.Name == "Enterprise Analytics");
        result.Products.Should().Contain(p => p.Name == "Team Collaboration Suite");
    }

    [Fact]
    public async Task ExtractCandidates_ShouldExtractTrustSignals_FromUrlPatterns()
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://example.com"
        };

        var pages = new List<CrawledPage>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/testimonials",
                Title = "Testimonials",
            },
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/case-studies",
                Title = "Case Studies",
            }
        };

        var result = await _extractor.ExtractCandidatesAsync(brand, pages);

        result.TrustSignals.Should().NotBeEmpty();
        result.TrustSignals.Should().Contain(ts => ts.SignalType == TrustSignalType.TestimonialsAndReviews);
        result.TrustSignals.Should().Contain(ts => ts.SignalType == TrustSignalType.CaseStudiesAndSuccessMetrics);
    }

    [Fact]
    public async Task ExtractCandidates_ShouldReturnDefaultGlobalMarket_WhenNoMarketDetected()
    {
        // .xyz has no TLD->country mapping and the page carries no currency signals,
        // so the extractor falls back to a default Global market.
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://example.xyz"
        };

        var pages = new List<CrawledPage>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.xyz/",
                Title = "Test Brand",
            }
        };

        var result = await _extractor.ExtractCandidatesAsync(brand, pages);

        result.Markets.Should().NotBeEmpty();
        result.Markets.Should().Contain(m => m.Name == "Global");
    }

    [Fact]
    public async Task ExtractCandidates_ShouldNotExtractTopics_TopicsGeneratedDuringConfirmation()
    {
        // Topics are no longer extracted from the crawl; they are generated during the
        // confirmation wizard from confirmed context (see ADDENDUM-002 / REQ-001 §5).
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://example.com"
        };

        var pages = new List<CrawledPage>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/",
                Title = "Test Brand",
                Headings = new List<Heading>
                {
                    new("h1", "Digital Marketing Automation"),
                    new("h2", "Email Campaign Optimization"),
                },
            }
        };

        var result = await _extractor.ExtractCandidatesAsync(brand, pages);

        result.Topics.Should().BeEmpty();
    }
}
