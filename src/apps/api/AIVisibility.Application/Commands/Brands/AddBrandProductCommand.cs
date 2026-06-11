using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Adds a user-authored product to a brand. Same shape as the topic /
/// competitor commands. ProductType defaults to <c>Product</c>, Aliases
/// defaults to an empty list, Description to null; deeper edits to those
/// fields land in a follow-up.
/// </summary>
public record AddBrandProductCommand(Guid BrandId, string Name) : IRequest<AddBrandProductResult>;

public sealed record AddBrandProductResult(Guid ProductId, string Name);
