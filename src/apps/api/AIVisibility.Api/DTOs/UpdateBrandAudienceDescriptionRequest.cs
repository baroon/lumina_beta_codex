namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/brands/{id}/audiences/{audienceId}/description body.
/// Null / empty <see cref="Description"/> clears the field.
/// </summary>
public record UpdateBrandAudienceDescriptionRequest(string? Description);
