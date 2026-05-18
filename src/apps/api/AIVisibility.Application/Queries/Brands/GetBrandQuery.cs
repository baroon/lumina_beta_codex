using MediatR;

namespace AIVisibility.Application.Queries.Brands;

public record GetBrandQuery(Guid BrandId) : IRequest<BrandDto?>;

public record BrandDto(
    Guid Id,
    string Name,
    string WebsiteUrl,
    DateTime CreatedAt,
    LatestDiscoveryDto? LatestDiscovery);

public record LatestDiscoveryDto(
    Guid Id,
    string Status,
    int PagesCrawled,
    DateTime StartedAt,
    DateTime? CompletedAt);
