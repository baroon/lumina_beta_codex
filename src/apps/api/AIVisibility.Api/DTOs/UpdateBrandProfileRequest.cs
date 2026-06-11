namespace AIVisibility.Api.DTOs;

public record UpdateBrandProfileRequest(
    string? ShortDescription,
    string? Industry,
    string? Category,
    string? Positioning);
