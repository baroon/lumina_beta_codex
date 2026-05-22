using MediatR;

namespace AIVisibility.Application.Commands.Trackers;

/// <summary>
/// Creates a Visibility Tracker (Draft) for a brand from its confirmed Discovery outputs.
/// If <paramref name="Name"/> is null/blank or equal to the system-generated name, the
/// generated name is used and IsNameUserEdited stays false.
/// </summary>
public record CreateTrackerCommand(Guid BrandId, string? Name = null) : IRequest<CreateTrackerResult>;

public record CreateTrackerResult(Guid TrackerId, string Name);
