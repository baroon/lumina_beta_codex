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

    [Fact]
    public void Generate_SkipsExcludedTexts()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[]
            {
                Template("What are the best {category} in {market}?"),
                Template("Tell me about {topic}."),
            },
            new[] { new CoverageRef(Guid.NewGuid(), "Pricing") },
            Array.Empty<CoverageRef>(),
            10,
            new[] { "What are the best CRM in US?" });

        var result = _generator.Generate(ctx);

        result.Should().NotContain(p => p.Text == "What are the best CRM in US?");
        result.Should().Contain(p => p.Text == "Tell me about Pricing.");
    }

    [Fact]
    public void Generate_TopiclessTemplate_ProducesOnePrompt_AcrossManyTopics()
    {
        var ctx = new PromptGenerationContext(
            "Nostri",
            "Design Consultancy",
            "Global",
            new[] { Template("Is {brand} a reliable {category}? What is its reputation?") },
            new[]
            {
                new CoverageRef(Guid.NewGuid(), "Topic A"),
                new CoverageRef(Guid.NewGuid(), "Topic B"),
                new CoverageRef(Guid.NewGuid(), "Topic C"),
            },
            Array.Empty<CoverageRef>(),
            30);

        var result = _generator.Generate(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("Is Nostri a reliable Design Consultancy? What is its reputation?");
        result[0].PrimaryTopicId.Should().BeNull();
    }

    [Fact]
    public void Generate_CompetitorTemplate_OnePerCompetitor_NotPerTopic()
    {
        var ctx = new PromptGenerationContext(
            "Nostri",
            "Design Consultancy",
            "Global",
            new[] { Template("How does {brand} compare to {competitor} for {category}?") },
            new[]
            {
                new CoverageRef(Guid.NewGuid(), "Topic A"),
                new CoverageRef(Guid.NewGuid(), "Topic B"),
            },
            new[]
            {
                new CoverageRef(Guid.NewGuid(), "Rival One"),
                new CoverageRef(Guid.NewGuid(), "Rival Two"),
            },
            30);

        var result = _generator.Generate(ctx);

        result.Select(p => p.Text).Should().BeEquivalentTo(
            new[]
            {
                "How does Nostri compare to Rival One for Design Consultancy?",
                "How does Nostri compare to Rival Two for Design Consultancy?",
            });
    }

    [Fact]
    public void Generate_NeverProducesDuplicateTexts()
    {
        var ctx = new PromptGenerationContext(
            "Nostri",
            "Design Consultancy",
            "Global",
            new[]
            {
                Template("Is {brand} a reliable {category}?"),
                Template("Best {category} for {topic}?"),
            },
            new[]
            {
                new CoverageRef(Guid.NewGuid(), "Topic A"),
                new CoverageRef(Guid.NewGuid(), "Topic B"),
            },
            Array.Empty<CoverageRef>(),
            30);

        var result = _generator.Generate(ctx);

        var texts = result.Select(p => p.Text).ToList();
        texts.Should().OnlyHaveUniqueItems();
    }
}
