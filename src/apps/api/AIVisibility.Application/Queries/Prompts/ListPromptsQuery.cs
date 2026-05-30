using MediatR;

namespace AIVisibility.Application.Queries.Prompts;

public record ListPromptsQuery(Guid TrackerId) : IRequest<PromptListDto?>;

public record PromptListDto(
    int PromptAllocation,
    int Count,
    /// <summary>Tracked brand name — drives the prompt-generation progress title ('Crafting prompts for {brand}…').</summary>
    string BrandName,
    string TrackerName,
    List<PromptDto> Prompts,
    List<PromptOptionDto> Checks,
    List<PromptOptionDto> Topics);

public record PromptOptionDto(Guid Id, string Name);

public record PromptDto(
    Guid Id,
    string Text,
    string Status,
    string Source,
    Guid LensId,
    string LensName,
    List<string> Topics,
    string? ReviewReason);
