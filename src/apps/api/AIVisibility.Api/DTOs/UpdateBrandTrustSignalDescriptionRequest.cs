namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/brands/{id}/trust-signals/{trustSignalId}/description body.
/// Null / empty <see cref="Description"/> clears the field.
/// </summary>
public record UpdateBrandTrustSignalDescriptionRequest(string? Description);
