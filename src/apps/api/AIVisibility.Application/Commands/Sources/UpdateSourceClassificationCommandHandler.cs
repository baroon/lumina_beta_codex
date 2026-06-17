using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
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
        // Upsert: existing row gets promoted to UserCorrected; a missing
        // (brand, source) pair gets a fresh UserCorrected row created in
        // place. The old "404 when no row" behaviour was an artefact of
        // assuming SignalExtractor pre-creates the classification on
        // every scan — but reporting surfaces (workspace /sources) can
        // legitimately show sources before that side has run for the
        // active brand, so the user click must always succeed.
        var now = DateTime.UtcNow;
        var row = await _db.BrandSourceClassifications
            .FirstOrDefaultAsync(
                c => c.BrandId == request.BrandId && c.SourceId == request.SourceId,
                cancellationToken);
        if (row == null)
        {
            // Guard against a genuinely-missing Source — the FK would
            // throw on SaveChanges otherwise, and the 404 result reads
            // cleaner than a 500. The matching Brand row is assumed to
            // exist (the FE only exposes brands that came from the
            // workspace's own list, so a missing brandId here would be
            // a tampered request).
            var sourceExists = await _db.Sources
                .AnyAsync(s => s.Id == request.SourceId, cancellationToken);
            if (!sourceExists) return null;

            row = new BrandSourceClassification
            {
                Id = Guid.NewGuid(),
                BrandId = request.BrandId,
                SourceId = request.SourceId,
                SourceType = request.SourceType,
                ConfidenceScore = 1.0,
                ProvenanceSource = ClassificationSource.UserCorrected,
                Status = ClassificationStatus.UserCorrected,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.BrandSourceClassifications.Add(row);
        }
        else
        {
            row.SourceType = request.SourceType;
            row.ProvenanceSource = ClassificationSource.UserCorrected;
            row.Status = ClassificationStatus.UserCorrected;
            // Confidence is the user's verdict — explicit human correction
            // is ground-truth from the product's perspective.
            row.ConfidenceScore = 1.0;
            row.UpdatedAt = now;
        }

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
