using MediatR;

namespace AIVisibility.Application.Queries.Brands;

/// <summary>Lists all brands (most recent first) for the brand picker.</summary>
public record ListBrandsQuery : IRequest<List<BrandDto>>;
