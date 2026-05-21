using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using FluentAssertions;

namespace AIVisibility.Tests.Unit.Domain;

public class BrandTests
{
    [Fact]
    public void Brand_ShouldInitializeWithEmptyCollections()
    {
        var brand = new Brand();

        brand.DiscoveryRuns.Should().BeEmpty();
        brand.Products.Should().BeEmpty();
        brand.Audiences.Should().BeEmpty();
        brand.Markets.Should().BeEmpty();
        brand.Topics.Should().BeEmpty();
        brand.Competitors.Should().BeEmpty();
        brand.TrustSignals.Should().BeEmpty();
        brand.BrandProfile.Should().BeNull();
    }

    [Fact]
    public void Brand_ShouldSetPropertiesCorrectly()
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var brand = new Brand
        {
            Id = id,
            Name = "Test Brand",
            WebsiteUrl = "https://example.com",
            WorkspaceId = Guid.NewGuid(),
            CreatedAt = now,
            UpdatedAt = now
        };

        brand.Id.Should().Be(id);
        brand.Name.Should().Be("Test Brand");
        brand.WebsiteUrl.Should().Be("https://example.com");
        brand.CreatedAt.Should().Be(now);
    }

    [Fact]
    public void DiscoveryRun_ShouldHaveCorrectDefaults()
    {
        var run = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = Guid.NewGuid(),
            Status = DiscoveryStatus.Pending,
            StartedAt = DateTime.UtcNow
        };

        run.Status.Should().Be(DiscoveryStatus.Pending);
        run.PagesCrawled.Should().Be(0);
        run.CompletedAt.Should().BeNull();
        run.Error.Should().BeNull();
        run.CrawledPages.Should().BeEmpty();
    }

    [Fact]
    public void Product_ShouldStoreCandidateMetadata()
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            BrandId = Guid.NewGuid(),
            Name = "Test Product",
            ProductType = ProductType.Service,
            Confidence = 0.8,
            Source = CandidateSource.WebsiteCrawl,
            Status = CandidateStatus.Suggested
        };

        product.Confidence.Should().Be(0.8);
        product.Source.Should().Be(CandidateSource.WebsiteCrawl);
        product.Status.Should().Be(CandidateStatus.Suggested);
    }

    [Fact]
    public void TrustSignalType_ShouldHave7Values()
    {
        var values = Enum.GetValues<TrustSignalType>();
        values.Should().HaveCount(7);
    }
}
