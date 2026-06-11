using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RenameBrandCompetitorCommandHandler
    : IRequestHandler<RenameBrandCompetitorCommand, RenameBrandCompetitorResult>
{
    private readonly IAppDbContext _db;

    public RenameBrandCompetitorCommandHandler(IAppDbContext db) => _db = db;

    public async Task<RenameBrandCompetitorResult> Handle(
        RenameBrandCompetitorCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Competitor name cannot be empty.");

        var competitor = await _db.Competitors
            .FirstOrDefaultAsync(c => c.Id == request.CompetitorId, cancellationToken)
            ?? throw new InvalidOperationException($"Competitor {request.CompetitorId} not found.");

        if (competitor.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Competitor {request.CompetitorId} does not belong to brand {request.BrandId}.");

        if (string.Equals(competitor.Name, name, StringComparison.Ordinal))
            return new RenameBrandCompetitorResult(competitor.Id, competitor.Name);

        var clash = await _db.Competitors.AsNoTracking()
            .Where(c => c.BrandId == request.BrandId && c.Id != competitor.Id)
            .Select(c => c.Name)
            .ToListAsync(cancellationToken);
        if (clash.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException(
                $"Competitor '{name}' already exists on this brand.");

        competitor.Name = name;
        await _db.SaveChangesAsync(cancellationToken);

        return new RenameBrandCompetitorResult(competitor.Id, competitor.Name);
    }
}
