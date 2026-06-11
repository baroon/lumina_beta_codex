using MediatR;

namespace AIVisibility.Application.Commands.Trackers;

/// <summary>
/// Renames a tracker. Trims the supplied name; rejects empty input;
/// rejects case-insensitive duplicates within the same brand (mirrors
/// CreateTrackerCommandHandler — the brand-scoped unique index is the
/// load-bearing invariant). Sets IsNameUserEdited = true so the auto
/// namer's suffix logic doesn't try to re-derive a name later. The
/// API layer maps <see cref="DuplicateTrackerNameException"/> to 409
/// the same way create does.
/// </summary>
public record RenameTrackerCommand(Guid TrackerId, string Name) : IRequest<RenameTrackerResult>;

public sealed record RenameTrackerResult(Guid TrackerId, string Name);
