using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Scanning;
using FluentAssertions;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

public class OpenAiScanProviderTests
{
    private readonly Mock<IOpenAiService> _openAi = new();

    private OpenAiScanProvider Provider() => new(_openAi.Object);

    private void SetupResponse(string response) =>
        _openAi
            .Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    [Fact]
    public async Task GetAnswer_ReturnsAnswer_ForChatGpt()
    {
        SetupResponse("Acme is a great option.");
        var result = await Provider().GetAnswerAsync("ChatGpt", "Is Acme good?", CancellationToken.None);

        result.Success.Should().BeTrue();
        result.Text.Should().Be("Acme is a great option.");
    }

    [Fact]
    public async Task GetAnswer_NotConfigured_ForUnknownPlatform()
    {
        var result = await Provider().GetAnswerAsync("Gemini", "Is Acme good?", CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Gemini");
        _openAi.Verify(
            o => o.ChatCompletionAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<double>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetAnswer_Fails_WhenNoResponse()
    {
        SetupResponse(string.Empty);
        var result = await Provider().GetAnswerAsync("ChatGpt", "Is Acme good?", CancellationToken.None);

        result.Success.Should().BeFalse();
    }
}
