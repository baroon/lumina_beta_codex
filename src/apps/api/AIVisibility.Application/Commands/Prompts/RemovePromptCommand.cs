using MediatR;

namespace AIVisibility.Application.Commands.Prompts;

/// <summary>Archives a prompt so it no longer participates in scans (ADR-002 §9).</summary>
public record RemovePromptCommand(Guid TrackerId, Guid PromptId) : IRequest<Unit>;
