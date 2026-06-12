using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandMarketCountryCodeCommandHandler
    : IRequestHandler<UpdateBrandMarketCountryCodeCommand, UpdateBrandMarketCountryCodeResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandMarketCountryCodeCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandMarketCountryCodeResult> Handle(
        UpdateBrandMarketCountryCodeCommand request, CancellationToken cancellationToken)
    {
        var market = await _db.Markets
            .FirstOrDefaultAsync(m => m.Id == request.MarketId, cancellationToken)
            ?? throw new InvalidOperationException($"Market {request.MarketId} not found.");

        if (market.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Market {request.MarketId} does not belong to brand {request.BrandId}.");

        var normalized = NormalizeCountryCode(request.CountryCode);
        market.CountryCode = normalized;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandMarketCountryCodeResult(normalized);
    }

    /// <summary>
    /// Strict ISO 3166-1 alpha-2 normalization. Mirrors
    /// <c>ConfirmDiscoveryCommandHandler.NormalizeCountryCode</c>
    /// for the empty case, but throws on bad input — discovery is
    /// best-effort (silently dropping garbage from the LLM is fine),
    /// whereas a user typed value should fail loudly so they can
    /// correct it.
    /// </summary>
    private static string? NormalizeCountryCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim().ToUpperInvariant();
        if (trimmed.Length != 2 || !trimmed.All(char.IsLetter))
            throw new InvalidOperationException(
                $"Country code '{value}' must be an ISO 3166-1 alpha-2 code (two letters, e.g. US, GB, IN).");
        return trimmed;
    }
}
