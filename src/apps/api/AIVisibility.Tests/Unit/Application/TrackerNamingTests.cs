using AIVisibility.Application.Trackers;
using FluentAssertions;

namespace AIVisibility.Tests.Unit.Application;

public class TrackerNamingTests
{
    [Fact]
    public void Generate_UsesAllSegments_WhenPresent()
    {
        TrackerNaming.Generate("United States", "SaaS", "Analytics")
            .Should().Be("United States SaaS Visibility Tracker");
    }

    [Fact]
    public void Generate_FallsBackToGlobal_WhenMarketMissing()
    {
        TrackerNaming.Generate(null, "Chatbots", null)
            .Should().Be("Global Chatbots Visibility Tracker");
    }

    [Fact]
    public void Generate_FallsBackToProduct_WhenCategoryMissing()
    {
        TrackerNaming.Generate("Germany", null, "Photoshop")
            .Should().Be("Germany Photoshop Visibility Tracker");
    }

    [Fact]
    public void Generate_DropsDescriptor_WhenNeitherCategoryNorProduct()
    {
        TrackerNaming.Generate("Brazil", null, null)
            .Should().Be("Brazil Visibility Tracker");
    }

    [Fact]
    public void GenerateUnique_ReturnsBase_WhenNoCollision()
    {
        TrackerNaming.GenerateUnique("US", "SaaS", "Analytics", new[] { "Other Tracker" })
            .Should().Be("US SaaS Visibility Tracker");
    }

    [Fact]
    public void GenerateUnique_AppendsTwo_WhenBaseCollides()
    {
        TrackerNaming.GenerateUnique(
                "US",
                "SaaS",
                "Analytics",
                new[] { "US SaaS Visibility Tracker" })
            .Should().Be("US SaaS Visibility Tracker (2)");
    }

    [Fact]
    public void GenerateUnique_SkipsTakenSuffixes()
    {
        TrackerNaming.GenerateUnique(
                "US",
                "SaaS",
                "Analytics",
                new[]
                {
                    "US SaaS Visibility Tracker",
                    "US SaaS Visibility Tracker (2)",
                    "US SaaS Visibility Tracker (3)",
                })
            .Should().Be("US SaaS Visibility Tracker (4)");
    }

    [Fact]
    public void GenerateUnique_IsCaseInsensitive()
    {
        // Matches the UNIQUE (brand_id, LOWER(name)) DB constraint.
        TrackerNaming.GenerateUnique(
                "US",
                "SaaS",
                "Analytics",
                new[] { "us saas visibility tracker" })
            .Should().Be("US SaaS Visibility Tracker (2)");
    }

    [Fact]
    public void GenerateUnique_FillsGap_WhenIntermediateSuffixWasDeleted()
    {
        // If "(2)" was deleted but "(3)" remains, the next create should
        // reuse "(2)" rather than jumping to "(4)".
        TrackerNaming.GenerateUnique(
                "US",
                "SaaS",
                "Analytics",
                new[]
                {
                    "US SaaS Visibility Tracker",
                    "US SaaS Visibility Tracker (3)",
                })
            .Should().Be("US SaaS Visibility Tracker (2)");
    }
}
