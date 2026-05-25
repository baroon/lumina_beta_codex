using MediatR;

namespace AIVisibility.Application.Commands.Prompts;

/// <summary>
/// Generates (or regenerates) Draft prompts for a tracker from its coverage. With no filters this
/// replaces all Draft prompts; passing a Visibility Lens and/or Topic regenerates only that slice.
/// </summary>
public record GeneratePromptsCommand(
    Guid TrackerId,
    Guid? VisibilityLensId = null,
    Guid? TopicId = null) : IRequest<GeneratePromptsResult>;

public record GeneratePromptsResult(int Count);
