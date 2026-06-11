using MediatR;

namespace AIVisibility.Application.Commands.Trackers;

/// <summary>
/// Replaces the tracker's lens set with the provided list. At least one
/// lens is required (mirrors the "min 1 lens per tracker" invariant that
/// <see cref="CreateTrackerCommandHandler"/> establishes by auto-assigning
/// all 6 lenses to a new tracker). Unknown lens IDs are silently dropped
/// so a stale FE client can't poison the set; if zero valid IDs survive
/// the filter the handler throws.
/// </summary>
public record UpdateTrackerLensesCommand(
    Guid TrackerId,
    IReadOnlyList<Guid> LensIds) : IRequest<UpdateTrackerLensesResult>;

public sealed record UpdateTrackerLensesResult(int SelectedLensCount);
