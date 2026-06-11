using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RemoveBrandTrustSignalCommandHandler : IRequestHandler<RemoveBrandTrustSignalCommand>
{
    private readonly IAppDbContext _db;

    public RemoveBrandTrustSignalCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(
        RemoveBrandTrustSignalCommand request, CancellationToken cancellationToken)
    {
        var trustSignal = await _db.TrustSignals
            .FirstOrDefaultAsync(t => t.Id == request.TrustSignalId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Trust signal {request.TrustSignalId} not found.");

        if (trustSignal.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Trust signal {request.TrustSignalId} does not belong to brand {request.BrandId}.");

        _db.TrustSignals.Remove(trustSignal);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
