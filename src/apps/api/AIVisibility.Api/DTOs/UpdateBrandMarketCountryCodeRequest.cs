namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/brands/{id}/markets/{marketId}/country-code body. Null /
/// empty <see cref="CountryCode"/> clears the field — required for
/// regional ("Europe") or global markets.
/// </summary>
public record UpdateBrandMarketCountryCodeRequest(string? CountryCode);
