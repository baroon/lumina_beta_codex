using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RenameBrandMarketCommandHandler
    : IRequestHandler<RenameBrandMarketCommand, RenameBrandMarketResult>
{
    private readonly IAppDbContext _db;

    public RenameBrandMarketCommandHandler(IAppDbContext db) => _db = db;

    public async Task<RenameBrandMarketResult> Handle(
        RenameBrandMarketCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Market name cannot be empty.");

        var market = await _db.Markets
            .FirstOrDefaultAsync(m => m.Id == request.MarketId, cancellationToken)
            ?? throw new InvalidOperationException($"Market {request.MarketId} not found.");

        if (market.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Market {request.MarketId} does not belong to brand {request.BrandId}.");

        if (string.Equals(market.Name, name, StringComparison.Ordinal))
            return new RenameBrandMarketResult(market.Id, market.Name);

        var clash = await _db.Markets.AsNoTracking()
            .Where(m => m.BrandId == request.BrandId && m.Id != market.Id)
            .Select(m => m.Name)
            .ToListAsync(cancellationToken);
        if (clash.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Market '{name}' already exists on this brand.");

        market.Name = name;
        await _db.SaveChangesAsync(cancellationToken);

        return new RenameBrandMarketResult(market.Id, market.Name);
    }
}
