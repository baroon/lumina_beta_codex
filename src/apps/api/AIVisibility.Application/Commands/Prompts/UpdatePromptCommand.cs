using MediatR;

namespace AIVisibility.Application.Commands.Prompts;

/// <summary>Edits the text of an existing prompt.</summary>
public record UpdatePromptCommand(Guid TrackerId, Guid PromptId, string Text) : IRequest<Unit>;
