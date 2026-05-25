using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Prompts;
using FluentAssertions;

namespace AIVisibility.Tests.Unit.Infrastructure;

public class TemplatePromptGeneratorTests
{
    private readonly TemplatePromptGenerator _generator = new();

    private static PromptTemplateInput Template(string text) => new(Guid.NewGuid(), Guid.NewGuid(), text);

    [Fact]
    public async Task Generate_FillsPlaceholders()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("What are the best {category} in {market}?") },
            new[] { new CoverageRef(Guid.NewGuid(), "Pricing") },
            Array.Empty<CoverageRef>(),
            10);

        var result = await _generator.GenerateAsync(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("What are the best CRM in US?");
    }

    [Fact]
    public async Task Generate_CapsAtAllocation()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("About {topic} one"), Template("About {topic} two") },
            new[] { new CoverageRef(Guid.NewGuid(), "A"), new CoverageRef(Guid.NewGuid(), "B") },
            Array.Empty<CoverageRef>(),
            3);

        (await _generator.GenerateAsync(ctx)).Should().HaveCount(3);
    }

    [Fact]
    public async Task Generate_SkipsCompetitorTemplates_WhenNoCompetitors()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("How does {brand} compare to {competitor}?") },
            Array.Empty<CoverageRef>(),
            Array.Empty<CoverageRef>(),
            10);

        (await _generator.GenerateAsync(ctx)).Should().BeEmpty();
    }

    [Fact]
    public async Task Generate_FillsCompetitor_AndRecordsMapping()
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

        var result = await _generator.GenerateAsync(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("How does Acme compare to Rival?");
        result[0].CompetitorIds.Should().ContainSingle().Which.Should().Be(competitorId);
    }

    [Fact]
    public async Task Generate_UsesCategory_WhenNoTopics()
    {
        var ctx = new PromptGenerationContext(
            "Acme",
            "CRM",
            "US",
            new[] { Template("Tell me about {topic}.") },
            Array.Empty<CoverageRef>(),
            Array.Empty<CoverageRef>(),
            10);

        var result = await _generator.GenerateAsync(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("Tell me about CRM.");
        result[0].TopicIds.Should().BeEmpty();
    }

    [Fact]
    public async Task Generate_SkipsExcludedTexts()
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

        var result = await _generator.GenerateAsync(ctx);

        result.Should().NotContain(p => p.Text == "What are the best CRM in US?");
        result.Should().Contain(p => p.Text == "Tell me about Pricing.");
    }

    [Fact]
    public async Task Generate_TopiclessTemplate_ProducesOnePrompt_AcrossManyTopics()
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

        var result = await _generator.GenerateAsync(ctx);

        result.Should().ContainSingle();
        result[0].Text.Should().Be("Is Nostri a reliable Design Consultancy? What is its reputation?");
        result[0].TopicIds.Should().BeEmpty();
    }

    [Fact]
    public async Task Generate_CompetitorTemplate_OnePerCompetitor_NotPerTopic()
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

        var result = await _generator.GenerateAsync(ctx);

        result.Select(p => p.Text).Should().BeEquivalentTo(
            new[]
            {
                "How does Nostri compare to Rival One for Design Consultancy?",
                "How does Nostri compare to Rival Two for Design Consultancy?",
            });
    }

    [Fact]
    public async Task Generate_NeverProducesDuplicateTexts()
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

        var result = await _generator.GenerateAsync(ctx);

        result.Select(p => p.Text).Should().OnlyHaveUniqueItems();
    }
}
