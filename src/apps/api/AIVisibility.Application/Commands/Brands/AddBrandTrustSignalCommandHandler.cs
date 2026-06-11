using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class AddBrandTrustSignalCommandHandler
    : IRequestHandler<AddBrandTrustSignalCommand, AddBrandTrustSignalResult>
{
    private readonly IAppDbContext _db;

    public AddBrandTrustSignalCommandHandler(IAppDbContext db) => _db = db;

    public async Task<AddBrandTrustSignalResult> Handle(
        AddBrandTrustSignalCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Trust signal name cannot be empty.");

        var brand = await _db.Brands.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        var existing = await _db.TrustSignals.AsNoTracking()
            .Where(t => t.BrandId == brand.Id)
            .Select(t => t.Name)
            .ToListAsync(cancellationToken);
        if (existing.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException(
                $"Trust signal '{name}' already exists on this brand.");

        var latestRunId = await _db.DiscoveryRuns.AsNoTracking()
            .Where(r => r.BrandId == brand.Id)
            .OrderByDescending(r => r.StartedAt)
            .Select(r => (Guid?)r.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "Brand has no DiscoveryRun to anchor the new trust signal to. Run discovery first.");

        var trustSignal = new TrustSignal
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            DiscoveryRunId = latestRunId,
            Name = name,
            Description = null,
            SignalType = TrustSignalType.AwardsAndRecognitions,
            Confidence = 1.0,
            Source = CandidateSource.UserAdded,
            CreatedAt = DateTime.UtcNow,
        };
        _db.TrustSignals.Add(trustSignal);
        await _db.SaveChangesAsync(cancellationToken);

        return new AddBrandTrustSignalResult(trustSignal.Id, trustSignal.Name);
    }
}
