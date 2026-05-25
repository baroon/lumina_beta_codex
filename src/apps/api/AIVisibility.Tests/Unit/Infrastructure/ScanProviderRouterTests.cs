using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Scanning;
using FluentAssertions;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

public class ScanProviderRouterTests
{
    [Fact]
    public async Task Routes_ToTheClientThatHandlesTheCode()
    {
        var gemini = new Mock<IPlatformClient>();
        gemini.Setup(c => c.Handles("Gemini")).Returns(true);
        gemini.Setup(c => c.GetAnswerAsync("q", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ScanAnswer(true, "answer", null));
        var other = new Mock<IPlatformClient>();
        other.Setup(c => c.Handles(It.IsAny<string>())).Returns(false);

        var router = new ScanProviderRouter(new[] { other.Object, gemini.Object });

        var result = await router.GetAnswerAsync("Gemini", "q", CancellationToken.None);

        result.Success.Should().BeTrue();
        result.Text.Should().Be("answer");
    }

    [Fact]
    public async Task ReturnsNotConfigured_WhenNoClientHandlesTheCode()
    {
        var client = new Mock<IPlatformClient>();
        client.Setup(c => c.Handles(It.IsAny<string>())).Returns(false);
        var router = new ScanProviderRouter(new[] { client.Object });

        var result = await router.GetAnswerAsync("Grok", "q", CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Grok");
    }

    [Fact]
    public void IsConfigured_ReflectsTheHandlingClient()
    {
        var gemini = new Mock<IPlatformClient>();
        gemini.Setup(c => c.Handles("Gemini")).Returns(true);
        gemini.Setup(c => c.IsConfigured).Returns(true);
        var router = new ScanProviderRouter(new[] { gemini.Object });

        router.IsConfigured("Gemini").Should().BeTrue();
        router.IsConfigured("Grok").Should().BeFalse(); // no client handles it
    }
}
