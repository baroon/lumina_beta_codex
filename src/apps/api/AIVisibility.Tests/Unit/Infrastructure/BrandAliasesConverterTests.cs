using AIVisibility.Infrastructure.Data.Configurations;
using FluentAssertions;

namespace AIVisibility.Tests.Unit.Infrastructure;

public class BrandAliasesConverterTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\"\"")] // legacy empty-string default that got stored in the jsonb column
    [InlineData("[]")]
    [InlineData("not json")]
    public void DeserializeAliases_ReturnsEmpty_ForBlankOrNonArray(string? json)
    {
        BrandConfiguration.DeserializeAliases(json).Should().BeEmpty();
    }

    [Fact]
    public void DeserializeAliases_ParsesJsonArray()
    {
        BrandConfiguration.DeserializeAliases("[\"Lumina\",\"Lumina AI\"]")
            .Should().Equal("Lumina", "Lumina AI");
    }
}
