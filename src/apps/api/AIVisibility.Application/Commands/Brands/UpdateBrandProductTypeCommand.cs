using AIVisibility.Domain.Enums;
using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Recategorizes a single brand product into one of the six
/// <see cref="ProductType"/> buckets. Discovery and the
/// AddBrandProduct helper both default user-added rows to
/// <c>Product</c>, so a per-product edit is the canonical way to
/// move a row out of the default bucket. Per-brand ownership is
/// enforced before write.
/// </summary>
public record UpdateBrandProductTypeCommand(
    Guid BrandId,
    Guid ProductId,
    ProductType ProductType) : IRequest<UpdateBrandProductTypeResult>;

public sealed record UpdateBrandProductTypeResult(ProductType ProductType);
