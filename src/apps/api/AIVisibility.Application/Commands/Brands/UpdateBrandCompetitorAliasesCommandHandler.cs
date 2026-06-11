using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandCompetitorAliasesCommandHandler
    : IRequestHandler<UpdateBrandCompetitorAliasesCommand, UpdateBrandCompetitorAliasesResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandCompetitorAliasesCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandCompetitorAliasesResult> Handle(
        UpdateBrandCompetitorAliasesCommand request, CancellationToken cancellationToken)
    {
        var competitor = await _db.Competitors
            .FirstOrDefaultAsync(c => c.Id == request.CompetitorId, cancellationToken)
            ?? throw new InvalidOperationException($"Competitor {request.CompetitorId} not found.");

        if (competitor.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Competitor {request.CompetitorId} does not belong to brand {request.BrandId}.");

        // Trim, drop empties, case-insensitive dedup preserving first-seen order.
        var normalized = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in request.Aliases)
        {
            var trimmed = raw?.Trim();
            if (string.IsNullOrEmpty(trimmed)) continue;
            if (string.Equals(trimmed, competitor.Name, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"Alias '{trimmed}' collides with the competitor's primary name.");
            if (seen.Add(trimmed)) normalized.Add(trimmed);
        }

        competitor.Aliases = normalized;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandCompetitorAliasesResult(normalized);
    }
}
