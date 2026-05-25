namespace AIVisibility.Api.DTOs;

public record ConfigureTrackerScheduleRequest(List<Guid> PlatformIds, string Cadence, string? Timezone);
