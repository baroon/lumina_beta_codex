using AIVisibility.Domain.Enums;
using MediatR;

namespace AIVisibility.Application.Commands.Sources;

/// <summary>
/// User correction of a <see cref="Domain.Entities.BrandSourceClassification"/>
/// (Phase 4 v1 plan §Slice 2, D11/D20). Flips the row to
/// <c>ProvenanceSource = UserCorrected</c> and <c>Status = UserCorrected</c>
/// so the LLM-classifier loop in <c>SignalExtractionJob</c> knows not to
/// touch this row on subsequent scans.
///
/// Idempotent: re-running with the same input leaves the row in the same
/// state. Returns null when no <c>BrandSourceClassification</c> exists for
/// the (brand, source) pair; the controller maps that to 404.
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
