using MediatR;

namespace AIVisibility.Application.Queries.Trackers;

/// <summary>
/// Lens-picker setup for a single tracker. Returns all known lenses
/// (ordered by display order) plus which of them this tracker is
/// currently subscribed to via <see cref="Domain.Entities.TrackerLens"/>.
/// Drives the Lenses card on the tracker edit screen.
/// </summary>
public record GetTrackerLensesQuery(Guid TrackerId) : IRequest<TrackerLensesSetupDto?>;

public sealed record TrackerLensesSetupDto(
    Guid TrackerId,
    string TrackerName,
    IReadOnlyList<LensOptionDto> Lenses,
    IReadOnlyList<Guid> SelectedLensIds);

public sealed record LensOptionDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    int DisplayOrder);
