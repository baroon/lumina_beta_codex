using MediatR;

namespace AIVisibility.Application.Queries.Trackers;

/// <summary>
/// Flat list of trackers across all brands, ordered by created date desc.
/// Basic navigation utility for the /trackers page — frontend lists every
/// configured tracker so users can click through to its dashboard.
/// </summary>
public record GetAllTrackersQuery() : IRequest<IReadOnlyList<TrackerListItemDto>>;

public sealed record TrackerListItemDto(
    Guid TrackerId,
    string Name,
    Guid BrandId,
    string BrandName,
    /// <summary>TrackerStatus enum code (Draft / Active / Paused / Archived).</summary>
    string Status,
    DateTime CreatedAt,
    int ScanCount,
    /// <summary>CompletedAt of the most recent Completed scan; null when no scan has completed yet.</summary>
    DateTime? LatestScanCompletedAt);
