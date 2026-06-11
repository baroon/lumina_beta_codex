using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RemoveBrandCompetitorCommandHandler : IRequestHandler<RemoveBrandCompetitorCommand>
{
    private readonly IAppDbContext _db;

    public RemoveBrandCompetitorCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(
        RemoveBrandCompetitorCommand request, CancellationToken cancellationToken)
    {
        var competitor = await _db.Competitors
            .FirstOrDefaultAsync(c => c.Id == request.CompetitorId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Competitor {request.CompetitorId} not found.");

        if (competitor.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Competitor {request.CompetitorId} does not belong to brand {request.BrandId}.");

        _db.Competitors.Remove(competitor);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
