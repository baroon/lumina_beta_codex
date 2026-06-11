using MediatR;

namespace AIVisibility.Application.Commands.Trackers;

/// <summary>
/// Hard-deletes a tracker and everything that descends from it: scans,
/// prompt runs, AI answers, mentions, citations, signals, prompts, and
/// every tracker_* junction row. The DB-level cascade FKs do all the
/// real work — the handler just removes the root row. Source / SourceUrl
/// rows survive (those are workspace-shared reference data, not
/// tracker-owned).
///
/// Pre-release decision: no soft-delete column. Per the memory rule
/// "data integrity over compat shims" + "no legacy framing pre-release",
/// removed trackers are removed.
/// </summary>
public record DeleteTrackerCommand(Guid TrackerId) : IRequest;
