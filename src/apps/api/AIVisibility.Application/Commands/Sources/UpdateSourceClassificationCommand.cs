using AIVisibility.Domain.Enums;
using MediatR;

namespace AIVisibility.Application.Commands.Sources;

/// <summary>
/// User correction of a <see cref="Domain.Entities.BrandSourceClassification"/>
/// (Phase 4 v1 plan §Slice 2, D11/D20). Upserts: an existing row is
/// flipped to <c>ProvenanceSource = UserCorrected</c> and
/// <c>Status = UserCorrected</c>; a missing (brand, source) pair gets
/// a fresh UserCorrected row created in place. Either way the
/// LLM-classifier loop in <c>SignalExtractionJob</c> learns not to
/// touch this row on subsequent scans.
///
/// Idempotent: re-running with the same input leaves the row in the
/// same state. Returns null only when the <c>SourceId</c> itself does
/// not exist; the controller maps that to 404.
/// </summary>
public record UpdateSourceClassificationCommand(
    Guid SourceId,
    Guid BrandId,
    SourceType SourceType) : IRequest<UpdateSourceClassificationResult?>;

public sealed record UpdateSourceClassificationResult(
    Guid ClassificationId,
    Guid BrandId,
    Guid SourceId,
    string SourceType,
    string Status,
    string ProvenanceSource,
    double ConfidenceScore,
    DateTime UpdatedAt);
