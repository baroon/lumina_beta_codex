namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/brands/{id}/products/{productId}/description body.
/// Null / empty <see cref="Description"/> clears the field.
/// </summary>
public record UpdateBrandProductDescriptionRequest(string? Description);
