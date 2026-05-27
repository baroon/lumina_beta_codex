using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Sources;

public class UpdateSourceClassificationCommandHandler
    : IRequestHandler<UpdateSourceClassificationCommand, UpdateSourceClassificationResult?>
{
    private readonly IAppDbContext _db;

    public UpdateSourceClassificationCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<UpdateSourceClassificationResult?> Handle(
        UpdateSourceClassificationCommand request, CancellationToken cancellationToken)
    {
        var row = await _db.BrandSourceClassifications
            .FirstOrDefaultAsync(
                c => c.BrandId == request.BrandId && c.SourceId == request.SourceId,
                cancellationToken);
        if (row == null) return null;

        row.SourceType = request.SourceType;
        row.ProvenanceSource = ClassificationSource.UserCorrected;
        row.Status = ClassificationStatus.UserCorrected;
        // Confidence is the user's verdict — explicit human correction is
        // ground-truth from the product's perspective.
        row.ConfidenceScore = 1.0;
        row.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateSourceClassificationResult(
            ClassificationId: row.Id,
            BrandId: row.BrandId,
            SourceId: row.SourceId,
            SourceType: row.SourceType.ToString(),
            Status: row.Status.ToString(),
            ProvenanceSource: row.ProvenanceSource.ToString(),
            ConfidenceScore: row.ConfidenceScore,
            UpdatedAt: row.UpdatedAt);
    }
}
