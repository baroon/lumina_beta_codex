using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Sets (or clears) the prose description on a single brand competitor.
/// Descriptions are user-facing notes shown in the competitor edit
/// surface — they don't drive mention detection or citation
/// classification, so the only normalization is trim-and-null-empty.
/// Per-brand ownership is enforced before write.
/// </summary>
public record UpdateBrandCompetitorDescriptionCommand(
    Guid BrandId,
    Guid CompetitorId,
    string? Description) : IRequest<UpdateBrandCompetitorDescriptionResult>;

public sealed record UpdateBrandCompetitorDescriptionResult(string? Description);
