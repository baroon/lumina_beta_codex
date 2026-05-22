namespace AIVisibility.Api.DTOs;

/// <summary>Create-tracker payload. Name is optional; null/blank uses the system-generated name.</summary>
public record CreateTrackerRequest(string? Name);
