using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandTrustSignalTypeCommandHandler
    : IRequestHandler<UpdateBrandTrustSignalTypeCommand, UpdateBrandTrustSignalTypeResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandTrustSignalTypeCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandTrustSignalTypeResult> Handle(
        UpdateBrandTrustSignalTypeCommand request, CancellationToken cancellationToken)
    {
        var signal = await _db.TrustSignals
            .FirstOrDefaultAsync(ts => ts.Id == request.TrustSignalId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Trust signal {request.TrustSignalId} not found.");

        if (signal.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Trust signal {request.TrustSignalId} does not belong to brand {request.BrandId}.");

        signal.SignalType = request.SignalType;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandTrustSignalTypeResult(request.SignalType);
    }
}
