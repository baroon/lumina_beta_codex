using MediatR;

namespace AIVisibility.Application.Commands.Prompts;

/// <summary>Generates (or regenerates) the Draft prompt set for a tracker from its coverage.</summary>
public record GeneratePromptsCommand(Guid TrackerId) : IRequest<GeneratePromptsResult>;

public record GeneratePromptsResult(int Count);
