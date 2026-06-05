using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Providers.OpenAi;
using AIVisibility.Tests.TestHelpers;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Application;

public class OpenAiResuggestServiceTests
{
    private readonly Mock<IOpenAiService> _openAi = new();

    private OpenAiResuggestService CreateService() =>
        new(_openAi.Object, new Mock<ILogger<OpenAiResuggestService>>().Object);

    private static ResuggestContext Context() =>
        new("Test Brand", "Tech", "SaaS", new() { "Product A" }, new() { "Marketers" }, new() { "US" });

    private void SetupCompetitor(string response) =>
        _openAi.Setup(o => o.ChatCompletionAsync(
            It.Is<string>(s => s.Contains("identify competitors")),
            It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(response));

    private void SetupTopics(string response) =>
        _openAi.Setup(o => o.ChatCompletionAsync(
            It.Is<string>(s => s.Contains("suggest industry topics")),
            It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(response));

    private void SetupAny(string response) =>
        _openAi.Setup(o => o.ChatCompletionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestEnvelope.Of(response));

    [Fact]
    public async Task ResuggestAsync_ParsesCompetitorsAndTopics()
    {
        SetupCompetitor("[{\"name\":\"Acme\",\"domain\":\"acme.com\",\"description\":\"Rival\",\"regionFit\":\"high\",\"scaleFit\":\"medium\",\"segmentFit\":\"high\",\"confidence\":0.9}]");
        SetupTopics("[\"Pricing Strategy\",\"Customer Support\"]");

        var result = await CreateService().ResuggestAsync(Context());

        result.Competitors.Should().ContainSingle();
        result.Competitors[0].Name.Should().Be("Acme");
        result.Competitors[0].Domain.Should().Be("acme.com");
        result.Competitors[0].Confidence.Should().Be(0.9);
        result.Competitors[0].Description.Should().Contain("Region: high");

        result.Topics.Should().HaveCount(2);
        result.Topics.Select(t => t.Name).Should().Contain(new[] { "Pricing Strategy", "Customer Support" });
        result.Topics[0].Confidence.Should().Be(0.7);
    }

    [Fact]
    public async Task ResuggestAsync_ClampsConfidenceAndStripsMarkdownFences()
    {
        SetupCompetitor("```json\n[{\"name\":\"Acme\",\"confidence\":1.5}]\n```");
        SetupTopics("[]");

        var result = await CreateService().ResuggestAsync(Context());

        result.Competitors.Should().ContainSingle();
        result.Competitors[0].Confidence.Should().Be(1.0);
        result.Topics.Should().BeEmpty();
    }

    [Fact]
    public async Task ResuggestAsync_ReturnsEmpty_OnBlankResponse()
    {
        SetupAny("");

        var result = await CreateService().ResuggestAsync(Context());

        result.Competitors.Should().BeEmpty();
        result.Topics.Should().BeEmpty();
    }

    [Fact]
    public async Task ResuggestAsync_ReturnsEmptyCompetitors_OnInvalidJson()
    {
        SetupCompetitor("sorry, I cannot help with that");
        SetupTopics("[\"Pricing\"]");

        var result = await CreateService().ResuggestAsync(Context());

        result.Competitors.Should().BeEmpty();
        result.Topics.Should().ContainSingle();
    }

    [Fact]
    public async Task RegenerateLensAsync_Products_MapsCandidates()
    {
        SetupAny("[{\"name\":\"Widget\",\"description\":\"A widget\",\"confidence\":0.85}]");

        var result = await CreateService().RegenerateLensAsync(Context(), "products", CancellationToken.None);

        result.Candidates.Should().ContainSingle();
        result.Candidates[0].Name.Should().Be("Widget");
        result.Candidates[0].Confidence.Should().Be(0.85);
        result.Candidates[0].Source.Should().Be("LLMSuggested");
    }

    [Fact]
    public async Task RegenerateLensAsync_Products_IncludesProductTypeMetadata()
    {
        // Regenerated products must carry a productType so they pass confirm validation.
        SetupAny("[{\"name\":\"Widget\",\"description\":\"A widget\",\"type\":\"Service\",\"confidence\":0.85}]");

        var result = await CreateService().RegenerateLensAsync(Context(), "products", CancellationToken.None);

        result.Candidates.Should().ContainSingle();
        result.Candidates[0].Metadata["productType"].Should().Be("Service");
    }

    [Fact]
    public async Task RegenerateLensAsync_Products_DefaultsMissingOrInvalidTypeToProduct()
    {
        SetupAny("[{\"name\":\"Widget\",\"confidence\":0.85}]");

        var result = await CreateService().RegenerateLensAsync(Context(), "products", CancellationToken.None);

        result.Candidates[0].Metadata["productType"].Should().Be("Product");
    }

    [Fact]
    public async Task RegenerateLensAsync_TrustSignals_IncludesSignalTypeMetadata()
    {
        SetupAny("[{\"name\":\"SOC2\",\"description\":\"Certified\",\"type\":\"CertificationsAndAccreditations\",\"confidence\":0.8}]");

        var result = await CreateService().RegenerateLensAsync(Context(), "trustsignals", CancellationToken.None);

        result.Candidates.Should().ContainSingle();
        result.Candidates[0].Metadata["signalType"].Should().Be("CertificationsAndAccreditations");
    }

    [Fact]
    public async Task RegenerateLensAsync_Competitors_IncludesDomainMetadata()
    {
        SetupAny("[{\"name\":\"Acme\",\"domain\":\"acme.com\",\"confidence\":0.7}]");

        var result = await CreateService().RegenerateLensAsync(Context(), "competitors", CancellationToken.None);

        result.Candidates.Should().ContainSingle();
        result.Candidates[0].Metadata["domain"].Should().Be("acme.com");
    }

    [Fact]
    public async Task RegenerateLensAsync_UnknownLens_Throws()
    {
        var act = () => CreateService().RegenerateLensAsync(Context(), "bogus", CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task RegenerateLensAsync_PassesExclusionsIntoThePrompt()
    {
        string? captured = null;
        _openAi
            .Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .Callback<string, string, int, double, CancellationToken>((_, prompt, _, _, _) => captured = prompt)
            .ReturnsAsync(TestEnvelope.Of("[]"));

        var ctx = new ResuggestContext(
            "Test Brand", "Tech", "SaaS",
            new() { "Product A" }, new() { "Marketers" }, new() { "US" },
            Exclude: new() { "Existing Widget" });

        await CreateService().RegenerateLensAsync(ctx, "products", CancellationToken.None);

        captured.Should().NotBeNull();
        captured!.Should().Contain("Existing Widget");
    }
}
