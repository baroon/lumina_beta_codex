using MediatR;

namespace AIVisibility.Application.Queries.Prompts;

public record ListPromptsQuery(Guid TrackerId) : IRequest<PromptListDto?>;

public record PromptListDto(
    int PromptAllocation,
    int Count,
    List<PromptDto> Prompts,
    List<PromptOptionDto> Checks,
    List<PromptOptionDto> Topics);

public record PromptOptionDto(Guid Id, string Name);

public record PromptDto(
    Guid Id,
    string Text,
    string Status,
    string Source,
    Guid VisibilityCheckId,
    string VisibilityCheckName,
    Guid? PrimaryTopicId,
    string? PrimaryTopicName);
