using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Sets (or clears) the ISO 3166-1 alpha-2 country code on a single
/// brand market. The code drives flag display on discovery cards and
/// other UI surfaces; regional/global markets ("Europe", "Global")
/// legitimately have no code, so empty/null is valid. Inputs are
/// uppercased and validated as exactly two letters — anything else
/// is rejected with an inline error rather than silently coerced to
/// null (which would lose the user's intent).
/// </summary>
public record UpdateBrandMarketCountryCodeCommand(
    Guid BrandId,
    Guid MarketId,
    string? CountryCode) : IRequest<UpdateBrandMarketCountryCodeResult>;

public sealed record UpdateBrandMarketCountryCodeResult(string? CountryCode);
