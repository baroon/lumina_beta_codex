using AIVisibility.Infrastructure.Crawling;
using FluentAssertions;

namespace AIVisibility.Tests.Unit.Application;

public class PagePriorityClassifierTests
{
    [Theory]
    [InlineData("https://example.com/", PageCategory.Homepage)]
    [InlineData("https://example.com", PageCategory.Homepage)]
    [InlineData("https://example.com/about", PageCategory.About)]
    [InlineData("https://example.com/company/team", PageCategory.About)]
    [InlineData("https://example.com/products", PageCategory.Product)]
    [InlineData("https://example.com/pricing", PageCategory.Pricing)]
    [InlineData("https://example.com/faq", PageCategory.FAQ)]
    [InlineData("https://example.com/contact", PageCategory.Contact)]
    [InlineData("https://example.com/blog/post-1", PageCategory.Blog)]
    [InlineData("https://example.com/random-page", PageCategory.Other)]
    public void Classify_ReturnsExpectedCategory(string url, PageCategory expected)
    {
        PagePriorityClassifier.Classify(url).Should().Be(expected);
    }

    [Theory]
    [InlineData("https://example.com/", 100)]
    [InlineData("https://example.com/about", 90)]
    [InlineData("https://example.com/products", 85)]
    [InlineData("https://example.com/pricing", 80)]
    [InlineData("https://example.com/faq", 60)]
    [InlineData("https://example.com/contact", 40)]
    [InlineData("https://example.com/blog", 30)]
    [InlineData("https://example.com/anything-else", 10)]
    public void GetPriority_ReturnsScoreForCategory(string url, int expected)
    {
        PagePriorityClassifier.GetPriority(url).Should().Be(expected);
    }
}
