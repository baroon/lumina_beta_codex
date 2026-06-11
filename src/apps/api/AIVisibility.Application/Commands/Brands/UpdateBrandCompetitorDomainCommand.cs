using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Sets (or clears) the canonical hostname on a single brand competitor.
/// <see cref="Domain"/> may be a bare hostname ("canva.com"), a hostname
/// with "www." ("www.canva.com"), or a full URL ("https://canva.com/about")
/// — all collapse to the lowercase host with "www." stripped, matching the
/// <c>NormalizeDomain</c> shape SignalExtractor uses for citation
/// classification. Empty / null clears the field. Per-brand ownership is
/// enforced before write.
/// </summary>
public record UpdateBrandCompetitorDomainCommand(
    Guid BrandId,
    Guid CompetitorId,
    string? Domain) : IRequest<UpdateBrandCompetitorDomainResult>;

public sealed record UpdateBrandCompetitorDomainResult(string? Domain);
