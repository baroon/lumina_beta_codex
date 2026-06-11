using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class AddBrandCompetitorCommandHandler
    : IRequestHandler<AddBrandCompetitorCommand, AddBrandCompetitorResult>
{
    private readonly IAppDbContext _db;

    public AddBrandCompetitorCommandHandler(IAppDbContext db) => _db = db;

    public async Task<AddBrandCompetitorResult> Handle(
        AddBrandCompetitorCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Competitor name cannot be empty.");

        var brand = await _db.Brands.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        // Compare names in memory rather than EF.Functions.ILike so the
        // InMemory test provider works. The per-brand competitor set is
        // bounded; pulling it is cheap.
        var existing = await _db.Competitors.AsNoTracking()
            .Where(c => c.BrandId == brand.Id)
            .Select(c => c.Name)
            .ToListAsync(cancellationToken);
        if (existing.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException(
                $"Competitor '{name}' already exists on this brand.");

        var latestRunId = await _db.DiscoveryRuns.AsNoTracking()
            .Where(r => r.BrandId == brand.Id)
            .OrderByDescending(r => r.StartedAt)
            .Select(r => (Guid?)r.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "Brand has no DiscoveryRun to anchor the new competitor to. Run discovery first.");

        var competitor = new Competitor
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            DiscoveryRunId = latestRunId,
            Name = name,
            Aliases = new List<string>(),
            Domain = null,
            Description = null,
            Confidence = 1.0,
            Source = CandidateSource.UserAdded,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Competitors.Add(competitor);
        await _db.SaveChangesAsync(cancellationToken);

        return new AddBrandCompetitorResult(competitor.Id, competitor.Name);
    }
}
