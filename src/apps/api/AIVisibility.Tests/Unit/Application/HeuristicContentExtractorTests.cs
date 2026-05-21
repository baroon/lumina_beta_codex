using System.Text.Json;
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
                HeadingsJson = JsonSerializer.Serialize(new[]
                {
                    new { tag = "h1", text = "The All-in-One Marketing Platform" },
                    new { tag = "h2", text = "Analytics Dashboard" },
                    new { tag = "h2", text = "Campaign Manager" }
                }),
                StatusCode = 200
            }
        };

        var result = await _extractor.ExtractCandidatesAsync(brand, pages);

        result.BrandProfile.Should().NotBeNull();
        result.BrandProfile!.ShortDescription.Should().Contain("software platform");
        result.BrandProfile.Industry.Should().Be("Technology");
        result.BrandProfile.Source.Should().Be(CandidateSource.WebsiteCrawl);
        result.BrandProfile.Status.Should().Be(CandidateStatus.Suggested);
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
                HeadingsJson = JsonSerializer.Serialize(new[]
                {
                    new { tag = "h1", text = "Our Products" },
                    new { tag = "h2", text = "Enterprise Analytics" },
                    new { tag = "h2", text = "Team Collaboration Suite" },
                    new { tag = "h3", text = "Real-time Reporting Engine" }
                }),
                StatusCode = 200
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
                HeadingsJson = "[]",
                StatusCode = 200
            },
            new()
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/case-studies",
                Title = "Case Studies",
                HeadingsJson = "[]",
                StatusCode = 200
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
                HeadingsJson = "[]",
                StatusCode = 200
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
                HeadingsJson = JsonSerializer.Serialize(new[]
                {
                    new { tag = "h1", text = "Digital Marketing Automation" },
                    new { tag = "h2", text = "Email Campaign Optimization" }
                }),
                StatusCode = 200
            }
        };

        var result = await _extractor.ExtractCandidatesAsync(brand, pages);

        result.Topics.Should().BeEmpty();
    }
}
