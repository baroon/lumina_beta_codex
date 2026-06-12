using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandTrustSignalDescriptionCommandHandler
    : IRequestHandler<
        UpdateBrandTrustSignalDescriptionCommand,
        UpdateBrandTrustSignalDescriptionResult>
{
    private const int MaxLength = 2000;
    private readonly IAppDbContext _db;

    public UpdateBrandTrustSignalDescriptionCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandTrustSignalDescriptionResult> Handle(
        UpdateBrandTrustSignalDescriptionCommand request, CancellationToken cancellationToken)
    {
        var signal = await _db.TrustSignals
            .FirstOrDefaultAsync(ts => ts.Id == request.TrustSignalId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Trust signal {request.TrustSignalId} not found.");

        if (signal.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Trust signal {request.TrustSignalId} does not belong to brand {request.BrandId}.");

        var trimmed = request.Description?.Trim();
        var normalized = string.IsNullOrEmpty(trimmed) ? null : trimmed;

        if (normalized?.Length > MaxLength)
            throw new InvalidOperationException(
                $"Description must be {MaxLength} characters or fewer (got {normalized.Length}).");

        signal.Description = normalized;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandTrustSignalDescriptionResult(normalized);
    }
}
