using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandCompetitorDescriptionCommandHandler
    : IRequestHandler<UpdateBrandCompetitorDescriptionCommand, UpdateBrandCompetitorDescriptionResult>
{
    private const int MaxLength = 2000;
    private readonly IAppDbContext _db;

    public UpdateBrandCompetitorDescriptionCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandCompetitorDescriptionResult> Handle(
        UpdateBrandCompetitorDescriptionCommand request, CancellationToken cancellationToken)
    {
        var competitor = await _db.Competitors
            .FirstOrDefaultAsync(c => c.Id == request.CompetitorId, cancellationToken)
            ?? throw new InvalidOperationException($"Competitor {request.CompetitorId} not found.");

        if (competitor.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Competitor {request.CompetitorId} does not belong to brand {request.BrandId}.");

        var trimmed = request.Description?.Trim();
        var normalized = string.IsNullOrEmpty(trimmed) ? null : trimmed;

        if (normalized?.Length > MaxLength)
            throw new InvalidOperationException(
                $"Description must be {MaxLength} characters or fewer (got {normalized.Length}).");

        competitor.Description = normalized;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandCompetitorDescriptionResult(normalized);
    }
}
