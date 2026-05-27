using MediatR;

namespace AIVisibility.Application.Queries.Scans;

/// <summary>
/// Flat list of scans across all trackers, ordered by start time descending.
/// Temporary navigation utility for the /scans page — frontend lists every
/// recent scan so users can click through to results without needing to
/// know scan IDs. Capped at 100 rows; replace with pagination if/when this
/// becomes a real feature.
/// </summary>
public record GetAllScansQuery() : IRequest<IReadOnlyList<ScanListItemDto>>;

public sealed record ScanListItemDto(
    Guid ScanRunId,
    Guid TrackerId,
    string TrackerName,
    Guid BrandId,
    string BrandName,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string ScanStatus,                  // ScanRunStatus
    string? AnalysisStatus,             // AnalysisJobStatus or null if not yet created
    int ScanCheckCount,
    int CompletedCount,
    int FailedCount);
