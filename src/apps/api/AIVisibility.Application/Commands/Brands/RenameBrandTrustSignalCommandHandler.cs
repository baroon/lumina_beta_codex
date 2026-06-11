using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RenameBrandTrustSignalCommandHandler
    : IRequestHandler<RenameBrandTrustSignalCommand, RenameBrandTrustSignalResult>
{
    private readonly IAppDbContext _db;

    public RenameBrandTrustSignalCommandHandler(IAppDbContext db) => _db = db;

    public async Task<RenameBrandTrustSignalResult> Handle(
        RenameBrandTrustSignalCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Trust signal name cannot be empty.");

        var trustSignal = await _db.TrustSignals
            .FirstOrDefaultAsync(t => t.Id == request.TrustSignalId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Trust signal {request.TrustSignalId} not found.");

        if (trustSignal.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Trust signal {request.TrustSignalId} does not belong to brand {request.BrandId}.");

        if (string.Equals(trustSignal.Name, name, StringComparison.Ordinal))
            return new RenameBrandTrustSignalResult(trustSignal.Id, trustSignal.Name);

        var clash = await _db.TrustSignals.AsNoTracking()
            .Where(t => t.BrandId == request.BrandId && t.Id != trustSignal.Id)
            .Select(t => t.Name)
            .ToListAsync(cancellationToken);
        if (clash.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException(
                $"Trust signal '{name}' already exists on this brand.");

        trustSignal.Name = name;
        await _db.SaveChangesAsync(cancellationToken);

        return new RenameBrandTrustSignalResult(trustSignal.Id, trustSignal.Name);
    }
}
