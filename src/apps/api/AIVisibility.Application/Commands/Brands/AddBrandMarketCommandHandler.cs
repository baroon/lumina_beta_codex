using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class AddBrandMarketCommandHandler
    : IRequestHandler<AddBrandMarketCommand, AddBrandMarketResult>
{
    private readonly IAppDbContext _db;

    public AddBrandMarketCommandHandler(IAppDbContext db) => _db = db;

    public async Task<AddBrandMarketResult> Handle(
        AddBrandMarketCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Market name cannot be empty.");

        var brand = await _db.Brands.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        var existing = await _db.Markets.AsNoTracking()
            .Where(m => m.BrandId == brand.Id)
            .Select(m => m.Name)
            .ToListAsync(cancellationToken);
        if (existing.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Market '{name}' already exists on this brand.");

        var latestRunId = await _db.DiscoveryRuns.AsNoTracking()
            .Where(r => r.BrandId == brand.Id)
            .OrderByDescending(r => r.StartedAt)
            .Select(r => (Guid?)r.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "Brand has no DiscoveryRun to anchor the new market to. Run discovery first.");

        var market = new Market
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            DiscoveryRunId = latestRunId,
            Name = name,
            CountryCode = null,
            Confidence = 1.0,
            Source = CandidateSource.UserAdded,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Markets.Add(market);
        await _db.SaveChangesAsync(cancellationToken);

        return new AddBrandMarketResult(market.Id, market.Name);
    }
}
