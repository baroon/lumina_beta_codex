namespace AIVisibility.Api.DTOs;

public record GenerateInsightsNarrativeRequest(
    DateTime? From,
    DateTime? To,
    List<Guid>? TrackerIds);
