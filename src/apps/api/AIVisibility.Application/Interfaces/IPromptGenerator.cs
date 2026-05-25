namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Generates draft prompts for a tracker from its coverage + prompt templates (ADR-002 §6).
/// V1 is a deterministic template-fill; an LLM-backed implementation can replace this later.
/// </summary>
public interface IPromptGenerator
{
    Task<IReadOnlyList<GeneratedPrompt>> GenerateAsync(
        PromptGenerationContext context,
        CancellationToken cancellationToken = default);
}

public record PromptTemplateInput(
    Guid PromptTemplateId,
    Guid VisibilityLensId,
    string TemplateText,
    string CheckName = "",
    string CheckDescription = "");

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
    IReadOnlyCollection<string>? Exclude = null,
    // Extra brand context for niche-specific LLM generation (ignored by the template fallback).
    string? Industry = null,
    string? Positioning = null,
    IReadOnlyList<CoverageRef>? Products = null,
    IReadOnlyList<CoverageRef>? Audiences = null,
    IReadOnlyList<CoverageRef>? Markets = null);

public record GeneratedPrompt(
    string Text,
    Guid VisibilityLensId,
    Guid PromptTemplateId,
    IReadOnlyList<Guid> TopicIds,
    IReadOnlyList<Guid> CompetitorIds,
    IReadOnlyList<Guid> ProductIds,
    IReadOnlyList<Guid> AudienceIds,
    IReadOnlyList<Guid> MarketIds);
