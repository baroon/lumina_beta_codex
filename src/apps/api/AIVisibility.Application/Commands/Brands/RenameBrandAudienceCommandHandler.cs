using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RenameBrandAudienceCommandHandler
    : IRequestHandler<RenameBrandAudienceCommand, RenameBrandAudienceResult>
{
    private readonly IAppDbContext _db;

    public RenameBrandAudienceCommandHandler(IAppDbContext db) => _db = db;

    public async Task<RenameBrandAudienceResult> Handle(
        RenameBrandAudienceCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Audience name cannot be empty.");

        var audience = await _db.Audiences
            .FirstOrDefaultAsync(a => a.Id == request.AudienceId, cancellationToken)
            ?? throw new InvalidOperationException($"Audience {request.AudienceId} not found.");

        if (audience.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Audience {request.AudienceId} does not belong to brand {request.BrandId}.");

        if (string.Equals(audience.Name, name, StringComparison.Ordinal))
            return new RenameBrandAudienceResult(audience.Id, audience.Name);

        var clash = await _db.Audiences.AsNoTracking()
            .Where(a => a.BrandId == request.BrandId && a.Id != audience.Id)
            .Select(a => a.Name)
            .ToListAsync(cancellationToken);
        if (clash.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Audience '{name}' already exists on this brand.");

        audience.Name = name;
        await _db.SaveChangesAsync(cancellationToken);

        return new RenameBrandAudienceResult(audience.Id, audience.Name);
    }
}
