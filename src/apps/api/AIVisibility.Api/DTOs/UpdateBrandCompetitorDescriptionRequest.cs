namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/brands/{id}/competitors/{competitorId}/description body.
/// Null / empty <see cref="Description"/> clears the field.
/// </summary>
public record UpdateBrandCompetitorDescriptionRequest(string? Description);
