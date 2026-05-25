namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Generates draft prompts for a tracker from its coverage + prompt templates (ADR-002 §6).
/// V1 is a deterministic template-fill; an LLM-backed implementation can replace this later.
/// </summary>
public interface IPromptGenerator
{
    IReadOnlyList<GeneratedPrompt> Generate(PromptGenerationContext context);
}

public record PromptTemplateInput(Guid PromptTemplateId, Guid VisibilityCheckId, string TemplateText);

public record CoverageRef(Guid Id, string Name);

public record PromptGenerationContext(
    string BrandName,
    string? Category,
    string? MarketName,
    IReadOnlyList<PromptTemplateInput> Templates,
    IReadOnlyList<CoverageRef> Topics,
    IReadOnlyList<CoverageRef> Competitors,
    int PromptAllocation,
    // Prompt texts to avoid reproducing (removed prompts + already-kept prompts).
    IReadOnlyCollection<string>? Exclude = null);

public record GeneratedPrompt(
    string Text,
    Guid VisibilityCheckId,
    Guid PromptTemplateId,
    Guid? PrimaryTopicId,
    IReadOnlyList<Guid> TopicIds,
    IReadOnlyList<Guid> CompetitorIds);
