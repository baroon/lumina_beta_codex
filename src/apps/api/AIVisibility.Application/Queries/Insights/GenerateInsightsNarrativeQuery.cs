using MediatR;

namespace AIVisibility.Application.Queries.Insights;

/// <summary>
/// Generates an LLM-authored summary of the workspace's current AI
/// visibility position. The handler internally fetches the same
/// workspace-overview snapshot the InsightsScreen already renders,
/// formats it as a structured prompt, and asks the configured LLM
/// (OpenAI in v1) to produce a 2-3 sentence narrative. The templated
/// fallback on the FE stays — this query only fires on an explicit
/// user click since LLM calls cost money.
/// </summary>
public record GenerateInsightsNarrativeQuery(
    DateTime? From,
    DateTime? To,
    IReadOnlyList<Guid>? TrackerIds = null) : IRequest<InsightsNarrativeDto>;

public sealed record InsightsNarrativeDto(
    /// <summary>The LLM's response text. Empty when the call failed.</summary>
    string Narrative,
    /// <summary>The platform code that served the response (e.g. "openai"). Useful for the FE byline.</summary>
    string PlatformCode);
