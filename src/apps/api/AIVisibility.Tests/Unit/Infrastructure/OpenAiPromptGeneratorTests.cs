using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Prompts;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

public class OpenAiPromptGeneratorTests
{
    private readonly Mock<IOpenAiService> _openAi = new();

    private OpenAiPromptGenerator CreateGenerator() =>
        new(
            _openAi.Object,
            new TemplatePromptGenerator(),
            new Mock<ILogger<OpenAiPromptGenerator>>().Object);

    private void SetupResponse(string response) =>
        _openAi
            .Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    private static PromptTemplateInput Template(Guid checkId, string text) =>
        new(Guid.NewGuid(), checkId, text);

    [Fact]
    public async Task GenerateAsync_MapsLlmPrompts_AndTopics()
    {
        var checkId = Guid.NewGuid();
        var topicId = Guid.NewGuid();
        SetupResponse(
            "[{\"prompt\":\"Which CRM is best for pricing?\",\"topics\":[\"Pricing\"]},"
            + "{\"prompt\":\"Top CRM tools in the US?\",\"topics\":[]}]");
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template(checkId, "What are the best {category}?") },
            new[] { new CoverageRef(topicId, "Pricing") },
            Array.Empty<CoverageRef>(),
            10);

        var result = await CreateGenerator().GenerateAsync(ctx);

        result.Should().HaveCount(2);
        result.Should().Contain(p => p.Text == "Which CRM is best for pricing?" && p.TopicIds.Contains(topicId));
        result.Should().Contain(p => p.Text == "Top CRM tools in the US?" && p.TopicIds.Count == 0);
        result.Should().OnlyContain(p => p.LensId == checkId);
    }

    [Fact]
    public async Task GenerateAsync_DeduplicatesAndHonoursExclude()
    {
        var checkId = Guid.NewGuid();
        SetupResponse(
            "[{\"prompt\":\"Repeated prompt\"},{\"prompt\":\"Repeated prompt\"},{\"prompt\":\"Removed one\"}]");
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template(checkId, "Best {category}?") },
            Array.Empty<CoverageRef>(),
            Array.Empty<CoverageRef>(),
            10,
            new[] { "Removed one" });

        var result = await CreateGenerator().GenerateAsync(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("Repeated prompt");
    }

    [Fact]
    public async Task GenerateAsync_FallsBackToTemplates_WhenLlmEmpty()
    {
        SetupResponse(string.Empty); // no API key or failure → empty response
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template(Guid.NewGuid(), "What are the best {category} in {market}?") },
            Array.Empty<CoverageRef>(),
            Array.Empty<CoverageRef>(),
            10);

        var result = await CreateGenerator().GenerateAsync(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("What are the best CRM in US?");
    }

    [Fact]
    public async Task GenerateAsync_PassesBrandContextAndCheckIntentToTheLlm()
    {
        string? captured = null;
        _openAi
            .Setup(o => o.ChatCompletionAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, string, int, double, CancellationToken>((_, user, _, _, _) => captured = user)
            .ReturnsAsync("[{\"prompt\":\"x\"}]");

        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[]
            {
                new PromptTemplateInput(
                    Guid.NewGuid(),
                    Guid.NewGuid(),
                    "Best {category}?",
                    "Buying Intent",
                    "Purchase-ready prompts"),
            },
            new[] { new CoverageRef(Guid.NewGuid(), "Pricing") },
            Array.Empty<CoverageRef>(),
            10,
            Exclude: null,
            Industry: "Software",
            Positioning: "Affordable CRM for small teams",
            Products: new[] { new CoverageRef(Guid.NewGuid(), "Lead Tracker") },
            Audiences: new[] { new CoverageRef(Guid.NewGuid(), "Small businesses") });

        await CreateGenerator().GenerateAsync(ctx);

        captured.Should().NotBeNull();
        captured!.Should().Contain("Buying Intent");
        captured.Should().Contain("Lead Tracker");
        captured.Should().Contain("Affordable CRM for small teams");
        captured.Should().Contain("Small businesses");
    }

    [Fact]
    public async Task GenerateAsync_MapsAllReferencedDimensions()
    {
        var checkId = Guid.NewGuid();
        var topicId = Guid.NewGuid();
        var competitorId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var audienceId = Guid.NewGuid();
        var marketId = Guid.NewGuid();
        SetupResponse(
            "[{\"prompt\":\"q\",\"topics\":[\"T\"],\"competitors\":[\"C\"],"
            + "\"products\":[\"P\"],\"audiences\":[\"A\"],\"markets\":[\"M\"]}]");
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template(checkId, "Best {category}?") },
            new[] { new CoverageRef(topicId, "T") },
            new[] { new CoverageRef(competitorId, "C") },
            10,
            Exclude: null,
            Industry: null,
            Positioning: null,
            Products: new[] { new CoverageRef(productId, "P") },
            Audiences: new[] { new CoverageRef(audienceId, "A") },
            Markets: new[] { new CoverageRef(marketId, "M") });

        var result = await CreateGenerator().GenerateAsync(ctx);

        var p = result.Should().ContainSingle().Subject;
        p.TopicIds.Should().ContainSingle().Which.Should().Be(topicId);
        p.CompetitorIds.Should().ContainSingle().Which.Should().Be(competitorId);
        p.ProductIds.Should().ContainSingle().Which.Should().Be(productId);
        p.AudienceIds.Should().ContainSingle().Which.Should().Be(audienceId);
        p.MarketIds.Should().ContainSingle().Which.Should().Be(marketId);
    }
}
