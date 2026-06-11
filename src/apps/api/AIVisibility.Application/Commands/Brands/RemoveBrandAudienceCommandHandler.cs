using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RemoveBrandAudienceCommandHandler : IRequestHandler<RemoveBrandAudienceCommand>
{
    private readonly IAppDbContext _db;

    public RemoveBrandAudienceCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(
        RemoveBrandAudienceCommand request, CancellationToken cancellationToken)
    {
        var audience = await _db.Audiences
            .FirstOrDefaultAsync(a => a.Id == request.AudienceId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Audience {request.AudienceId} not found.");

        if (audience.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Audience {request.AudienceId} does not belong to brand {request.BrandId}.");

        _db.Audiences.Remove(audience);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
