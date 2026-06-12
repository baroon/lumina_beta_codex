namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/brands/{id}/products/{productId}/type body.
/// <see cref="ProductType"/> is the enum name (e.g. "Service"); the
/// controller parses it case-insensitively and returns 400 if it
/// doesn't match one of the six values.
/// </summary>
public record UpdateBrandProductTypeRequest(string ProductType);
