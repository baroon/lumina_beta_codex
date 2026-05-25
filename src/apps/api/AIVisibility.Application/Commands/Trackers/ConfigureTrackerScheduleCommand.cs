using MediatR;

namespace AIVisibility.Application.Commands.Trackers;

/// <summary>Sets the tracker's platforms + cadence and activates it (Draft → Active), ADR-002 §14.</summary>
public record ConfigureTrackerScheduleCommand(
    Guid TrackerId,
    IReadOnlyList<Guid> PlatformIds,
    string Cadence,
    string? Timezone) : IRequest<ConfigureTrackerScheduleResult>;

public record ConfigureTrackerScheduleResult(int ScanCheckCount, string Cadence);
