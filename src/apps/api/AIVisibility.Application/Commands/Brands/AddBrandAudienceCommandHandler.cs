using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class AddBrandAudienceCommandHandler
    : IRequestHandler<AddBrandAudienceCommand, AddBrandAudienceResult>
{
    private readonly IAppDbContext _db;

    public AddBrandAudienceCommandHandler(IAppDbContext db) => _db = db;

    public async Task<AddBrandAudienceResult> Handle(
        AddBrandAudienceCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Audience name cannot be empty.");

        var brand = await _db.Brands.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        var existing = await _db.Audiences.AsNoTracking()
            .Where(a => a.BrandId == brand.Id)
            .Select(a => a.Name)
            .ToListAsync(cancellationToken);
        if (existing.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Audience '{name}' already exists on this brand.");

        var latestRunId = await _db.DiscoveryRuns.AsNoTracking()
            .Where(r => r.BrandId == brand.Id)
            .OrderByDescending(r => r.StartedAt)
            .Select(r => (Guid?)r.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "Brand has no DiscoveryRun to anchor the new audience to. Run discovery first.");

        var audience = new Audience
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            DiscoveryRunId = latestRunId,
            Name = name,
            Description = null,
            Confidence = 1.0,
            Source = CandidateSource.UserAdded,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Audiences.Add(audience);
        await _db.SaveChangesAsync(cancellationToken);

        return new AddBrandAudienceResult(audience.Id, audience.Name);
    }
}
