using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandAudienceDescriptionCommandHandler
    : IRequestHandler<UpdateBrandAudienceDescriptionCommand, UpdateBrandAudienceDescriptionResult>
{
    private const int MaxLength = 2000;
    private readonly IAppDbContext _db;

    public UpdateBrandAudienceDescriptionCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandAudienceDescriptionResult> Handle(
        UpdateBrandAudienceDescriptionCommand request, CancellationToken cancellationToken)
    {
        var audience = await _db.Audiences
            .FirstOrDefaultAsync(a => a.Id == request.AudienceId, cancellationToken)
            ?? throw new InvalidOperationException($"Audience {request.AudienceId} not found.");

        if (audience.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Audience {request.AudienceId} does not belong to brand {request.BrandId}.");

        var trimmed = request.Description?.Trim();
        var normalized = string.IsNullOrEmpty(trimmed) ? null : trimmed;

        if (normalized?.Length > MaxLength)
            throw new InvalidOperationException(
                $"Description must be {MaxLength} characters or fewer (got {normalized.Length}).");

        audience.Description = normalized;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandAudienceDescriptionResult(normalized);
    }
}
