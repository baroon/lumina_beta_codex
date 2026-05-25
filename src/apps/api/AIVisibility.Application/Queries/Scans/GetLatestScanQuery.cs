using MediatR;

namespace AIVisibility.Application.Queries.Scans;

/// <summary>Latest scan run for a tracker, with live progress counts (for status polling).</summary>
public record GetLatestScanQuery(Guid TrackerId) : IRequest<ScanStatusDto?>;

public record ScanStatusDto(
    Guid ScanRunId,
    string Status,
    string TriggerType,
    int ScanCheckCount,
    int CompletedCount,
    int FailedCount,
    DateTime StartedAt,
    DateTime? CompletedAt);
