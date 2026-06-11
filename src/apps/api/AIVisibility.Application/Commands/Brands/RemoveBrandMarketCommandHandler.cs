using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RemoveBrandMarketCommandHandler : IRequestHandler<RemoveBrandMarketCommand>
{
    private readonly IAppDbContext _db;

    public RemoveBrandMarketCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(
        RemoveBrandMarketCommand request, CancellationToken cancellationToken)
    {
        var market = await _db.Markets
            .FirstOrDefaultAsync(m => m.Id == request.MarketId, cancellationToken)
            ?? throw new InvalidOperationException($"Market {request.MarketId} not found.");

        if (market.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Market {request.MarketId} does not belong to brand {request.BrandId}.");

        _db.Markets.Remove(market);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
