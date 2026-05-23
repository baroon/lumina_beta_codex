using MediatR;

namespace AIVisibility.Application.Queries.Prompts;

public record ListPromptsQuery(Guid TrackerId) : IRequest<PromptListDto?>;

public record PromptListDto(int PromptAllocation, int Count, List<PromptDto> Prompts);

public record PromptDto(
    Guid Id,
    string Text,
    string Status,
    string Source,
    Guid VisibilityCheckId,
    string VisibilityCheckName,
    Guid? PrimaryTopicId,
    string? PrimaryTopicName);
