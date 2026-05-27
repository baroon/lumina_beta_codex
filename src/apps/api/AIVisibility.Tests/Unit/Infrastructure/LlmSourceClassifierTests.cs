using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

/// <summary>
/// LlmSourceClassifier unit tests. <see cref="IOpenAiService"/> is the test
/// seam — these mock it to return canned JSON envelopes and verify parsing,
/// fallback on failure, and that the request payload contains the input
/// fields the prompt expects to see (Phase 4 v1 plan §Block 1).
/// </summary>
public class LlmSourceClassifierTests
{
    private static (LlmSourceClassifier Sut, Mock<IOpenAiService> OpenAi) Build(string llmResponse)
    {
        var openAi = new Mock<IOpenAiService>();
        openAi
            .Setup(s => s.ChatCompletionAsync(
                It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(llmResponse);
        var sut = new LlmSourceClassifier(openAi.Object, new Mock<ILogger<LlmSourceClassifier>>().Object);
        return (sut, openAi);
    }

    [Fact]
    public async Task Parses_HappyPath_Verdict()
    {
        const string json = """
            { "source_type": "Reference", "confidence_score": 0.95, "rationale": "Wikipedia is a reference work." }
            """;
        var (sut, _) = Build(json);

        var verdict = await sut.ClassifyAsync(
            new SourceClassificationRequest("Wikipedia", "en.wikipedia.org", "https://en.wikipedia.org/wiki/Foo"),
            CancellationToken.None);

        verdict.Should().NotBeNull();
        verdict!.SourceType.Should().Be(SourceType.Reference);
        verdict.ConfidenceScore.Should().BeApproximately(0.95, 1e-9);
        verdict.Rationale.Should().Contain("Wikipedia");
    }

    [Fact]
    public async Task IncludesSourceNameAndDomain_InUserPrompt()
    {
        // The classifier's accuracy depends on the LLM seeing the domain
        // plus name plus a sample URL. The system prompt is the load-bearing
        // contract — this test pins what the user prompt must contain so a
        // future "trim the prompt" refactor can't silently drop signal.
        const string json = """{ "source_type": "Editorial", "confidence_score": 0.8 }""";
        var (sut, openAi) = Build(json);

        await sut.ClassifyAsync(
            new SourceClassificationRequest("Wired Magazine", "wired.com", "https://wired.com/story/abc"),
            CancellationToken.None);

        openAi.Verify(s => s.ChatCompletionAsync(
            It.IsAny<string>(),
            It.Is<string>(user =>
                user.Contains("Wired Magazine") &&
                user.Contains("wired.com") &&
                user.Contains("https://wired.com/story/abc")),
            It.IsAny<int>(), It.IsAny<double>(),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ReturnsNull_OnEmptyResponse()
    {
        // IOpenAiService returns empty string on failure / missing API key —
        // the classifier must treat that as a per-source failure so the job
        // can keep the row at its rule-based verdict (D4).
        var (sut, _) = Build(string.Empty);
        var verdict = await sut.ClassifyAsync(
            new SourceClassificationRequest("Whatever", "whatever.com", null),
            CancellationToken.None);
        verdict.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNull_OnInvalidJson()
    {
        var (sut, _) = Build("not json at all");
        var verdict = await sut.ClassifyAsync(
            new SourceClassificationRequest("Trustpilot", "trustpilot.com", null),
            CancellationToken.None);
        verdict.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNull_OnUnknownSourceTypeCode()
    {
        // The LLM occasionally invents codes not in the enum. The classifier
        // must reject those rather than crash or guess — leave the row at
        // RuleBased/Unknown and let humans decide.
        const string json = """{ "source_type": "MadeUpType", "confidence_score": 0.5 }""";
        var (sut, _) = Build(json);

        var verdict = await sut.ClassifyAsync(
            new SourceClassificationRequest("Some Source", null, null),
            CancellationToken.None);

        verdict.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNull_WhenSourceNameIsEmpty()
    {
        // Defense-in-depth: extractor truncates source names to 500 chars but
        // doesn't currently reject empty ones. Classifier guards because an
        // empty source name produces a useless LLM call.
        var (sut, openAi) = Build("""{ "source_type": "Reference", "confidence_score": 0.9 }""");

        var verdict = await sut.ClassifyAsync(
            new SourceClassificationRequest("", "wiki.example", null),
            CancellationToken.None);

        verdict.Should().BeNull();
        // OpenAI must NOT have been called — empty-name guard runs first.
        openAi.Verify(s => s.ChatCompletionAsync(
            It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<int>(), It.IsAny<double>(),
            It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ToleratesMarkdownFencedJson()
    {
        // gpt-4o-mini sometimes wraps JSON in ```json ... ``` even when told
        // not to. Parser must trim to the outer JSON object.
        var fenced = "```json\n" + """
            { "source_type": "ReviewSite", "confidence_score": 0.92, "rationale": "G2 is a software review aggregator." }
            """ + "\n```";
        var (sut, _) = Build(fenced);

        var verdict = await sut.ClassifyAsync(
            new SourceClassificationRequest("G2", "g2.com", null),
            CancellationToken.None);

        verdict.Should().NotBeNull();
        verdict!.SourceType.Should().Be(SourceType.ReviewSite);
    }

    [Fact]
    public async Task DefaultsConfidence_When_NotProvidedByLlm()
    {
        // confidence_score is optional in the response shape — falls back to
        // 0.5 so the row still has a defensible value when the LLM is terse.
        const string json = """{ "source_type": "UGC" }""";
        var (sut, _) = Build(json);

        var verdict = await sut.ClassifyAsync(
            new SourceClassificationRequest("Reddit thread", "reddit.com", null),
            CancellationToken.None);

        verdict.Should().NotBeNull();
        verdict!.SourceType.Should().Be(SourceType.UGC);
        verdict.ConfidenceScore.Should().BeApproximately(0.5, 1e-9);
    }
}
