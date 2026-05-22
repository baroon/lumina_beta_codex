using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Prompts;
using FluentAssertions;

namespace AIVisibility.Tests.Unit.Infrastructure;

public class TemplatePromptGeneratorTests
{
    private readonly TemplatePromptGenerator _generator = new();

    private static PromptTemplateInput Template(string text) => new(Guid.NewGuid(), Guid.NewGuid(), text);

    [Fact]
    public void Generate_FillsPlaceholders()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("What are the best {category} in {market}?") },
            new[] { new CoverageRef(Guid.NewGuid(), "Pricing") },
            Array.Empty<CoverageRef>(),
            10);

        var result = _generator.Generate(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("What are the best CRM in US?");
    }

    [Fact]
    public void Generate_CapsAtAllocation()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("About {topic} one"), Template("About {topic} two") },
            new[] { new CoverageRef(Guid.NewGuid(), "A"), new CoverageRef(Guid.NewGuid(), "B") },
            Array.Empty<CoverageRef>(),
            3);

        // 2 templates x 2 topics = 4 possible, capped at allocation 3
        _generator.Generate(ctx).Should().HaveCount(3);
    }

    [Fact]
    public void Generate_SkipsCompetitorTemplates_WhenNoCompetitors()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("How does {brand} compare to {competitor}?") },
            Array.Empty<CoverageRef>(),
            Array.Empty<CoverageRef>(),
            10);

        _generator.Generate(ctx).Should().BeEmpty();
    }

    [Fact]
    public void Generate_FillsCompetitor_AndRecordsMapping()
    {
        var competitorId = Guid.NewGuid();
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("How does {brand} compare to {competitor}?") },
            Array.Empty<CoverageRef>(),
            new[] { new CoverageRef(competitorId, "Rival") },
            10);

        var result = _generator.Generate(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("How does Acme compare to Rival?");
        result[0].CompetitorIds.Should().ContainSingle().Which.Should().Be(competitorId);
    }

    [Fact]
    public void Generate_UsesCategory_WhenNoTopics()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("Tell me about {topic}.") },
            Array.Empty<CoverageRef>(),
            Array.Empty<CoverageRef>(),
            10);

        var result = _generator.Generate(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("Tell me about CRM.");
        result[0].PrimaryTopicId.Should().BeNull();
    }
}
