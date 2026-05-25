using MediatR;

namespace AIVisibility.Application.Queries.Trackers;

/// <summary>Setup data for the platform + cadence screen (ADR-002 §14): available platforms,
/// current/default selection, cadence, and the active prompt count for the scan-check estimate.</summary>
public record GetTrackerScheduleSetupQuery(Guid TrackerId) : IRequest<TrackerScheduleSetupDto?>;

public record TrackerScheduleSetupDto(
    Guid TrackerId,
    string TrackerName,
    string Cadence,
    string Timezone,
    int ActivePromptCount,
    List<PlatformOptionDto> Platforms,
    List<Guid> SelectedPlatformIds);

public record PlatformOptionDto(Guid Id, string Code, string Name);
