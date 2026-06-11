namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/brands/{id}/competitors/{competitorId}/domain body. Null /
/// empty <see cref="Domain"/> clears the field — required when a
/// competitor was discovered without a hostname or the user wants to
/// drop a wrong one.
/// </summary>
public record UpdateBrandCompetitorDomainRequest(string? Domain);
