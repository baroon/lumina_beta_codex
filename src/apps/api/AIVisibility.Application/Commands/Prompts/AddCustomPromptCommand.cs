using MediatR;

namespace AIVisibility.Application.Commands.Prompts;

/// <summary>Adds a user-authored prompt (Draft) to a tracker, within its prompt allocation.</summary>
public record AddCustomPromptCommand(
    Guid TrackerId,
    string Text,
    Guid VisibilityCheckId,
    Guid? PrimaryTopicId) : IRequest<Unit>;
