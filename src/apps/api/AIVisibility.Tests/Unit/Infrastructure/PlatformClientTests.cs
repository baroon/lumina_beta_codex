using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Scanning;
using FluentAssertions;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

public class PlatformClientTests
{
    private static void SetupOpenAi(Mock<IOpenAiService> m, string response) =>
        m.Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    private static void SetupClaude(Mock<IClaudeService> m, string response) =>
        m.Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    private static void SetupGemini(Mock<IGeminiService> m, string response) =>
        m.Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    private static void SetupGrok(Mock<IGrokService> m, string response) =>
        m.Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    private static void SetupPerplexity(Mock<IPerplexityService> m, string response) =>
        m.Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    private static void SetupCopilot(Mock<ICopilotService> m, string response) =>
        m.Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    [Fact]
    public void OpenAi_Handles_OnlyChatGptCodes()
    {
        var client = new OpenAiPlatformClient(new Mock<IOpenAiService>().Object);
        client.Handles("ChatGpt").Should().BeTrue();
        client.Handles("ChatGptSearch").Should().BeTrue();
        client.Handles("Gemini").Should().BeFalse();
    }

    [Fact]
    public async Task OpenAi_ReturnsAnswer_AndFailsWhenEmpty()
    {
        var openAi = new Mock<IOpenAiService>();
        SetupOpenAi(openAi, "ChatGPT answer.");
        (await new OpenAiPlatformClient(openAi.Object).GetAnswerAsync("q")).Text.Should().Be("ChatGPT answer.");

        SetupOpenAi(openAi, string.Empty);
        (await new OpenAiPlatformClient(openAi.Object).GetAnswerAsync("q")).Success.Should().BeFalse();
    }

    [Fact]
    public async Task Claude_Handles_AndReturnsAnswer()
    {
        var claude = new Mock<IClaudeService>();
        SetupClaude(claude, "Claude answer.");
        var client = new ClaudePlatformClient(claude.Object);

        client.Handles("Claude").Should().BeTrue();
        client.Handles("ChatGpt").Should().BeFalse();
        var result = await client.GetAnswerAsync("q");
        result.Success.Should().BeTrue();
        result.Text.Should().Be("Claude answer.");
    }

    [Fact]
    public async Task Claude_Fails_WhenEmpty()
    {
        var claude = new Mock<IClaudeService>();
        SetupClaude(claude, string.Empty);
        (await new ClaudePlatformClient(claude.Object).GetAnswerAsync("q")).Success.Should().BeFalse();
    }

    [Fact]
    public async Task Gemini_Handles_AndReturnsAnswer()
    {
        var gemini = new Mock<IGeminiService>();
        SetupGemini(gemini, "Gemini answer.");
        var client = new GeminiPlatformClient(gemini.Object);

        client.Handles("Gemini").Should().BeTrue();
        client.Handles("Claude").Should().BeFalse();
        var result = await client.GetAnswerAsync("q");
        result.Success.Should().BeTrue();
        result.Text.Should().Be("Gemini answer.");
    }

    [Fact]
    public async Task Gemini_Fails_WhenEmpty()
    {
        var gemini = new Mock<IGeminiService>();
        SetupGemini(gemini, string.Empty);
        (await new GeminiPlatformClient(gemini.Object).GetAnswerAsync("q")).Success.Should().BeFalse();
    }

    [Fact]
    public async Task Grok_Handles_AndReturnsAnswer()
    {
        var grok = new Mock<IGrokService>();
        SetupGrok(grok, "Grok answer.");
        var client = new GrokPlatformClient(grok.Object);

        client.Handles("Grok").Should().BeTrue();
        client.Handles("Gemini").Should().BeFalse();
        var result = await client.GetAnswerAsync("q");
        result.Success.Should().BeTrue();
        result.Text.Should().Be("Grok answer.");

        SetupGrok(grok, string.Empty);
        (await new GrokPlatformClient(grok.Object).GetAnswerAsync("q")).Success.Should().BeFalse();
    }

    [Fact]
    public async Task Perplexity_Handles_AndReturnsAnswer()
    {
        var perplexity = new Mock<IPerplexityService>();
        SetupPerplexity(perplexity, "Perplexity answer.");
        var client = new PerplexityPlatformClient(perplexity.Object);

        client.Handles("Perplexity").Should().BeTrue();
        client.Handles("Grok").Should().BeFalse();
        var result = await client.GetAnswerAsync("q");
        result.Success.Should().BeTrue();
        result.Text.Should().Be("Perplexity answer.");

        SetupPerplexity(perplexity, string.Empty);
        (await new PerplexityPlatformClient(perplexity.Object).GetAnswerAsync("q")).Success.Should().BeFalse();
    }

    [Fact]
    public async Task Copilot_Handles_AndReturnsAnswer()
    {
        var copilot = new Mock<ICopilotService>();
        SetupCopilot(copilot, "Copilot answer.");
        var client = new CopilotPlatformClient(copilot.Object);

        client.Handles("Copilot").Should().BeTrue();
        client.Handles("Perplexity").Should().BeFalse();
        var result = await client.GetAnswerAsync("q");
        result.Success.Should().BeTrue();
        result.Text.Should().Be("Copilot answer.");

        SetupCopilot(copilot, string.Empty);
        (await new CopilotPlatformClient(copilot.Object).GetAnswerAsync("q")).Success.Should().BeFalse();
    }

    [Fact]
    public void IsConfigured_DelegatesToService()
    {
        var openAi = new Mock<IOpenAiService>();
        openAi.Setup(s => s.IsConfigured).Returns(true);
        new OpenAiPlatformClient(openAi.Object).IsConfigured.Should().BeTrue();

        var claude = new Mock<IClaudeService>();
        claude.Setup(s => s.IsConfigured).Returns(false);
        new ClaudePlatformClient(claude.Object).IsConfigured.Should().BeFalse();
    }
}
