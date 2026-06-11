using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Removes a product from a brand. Cascade FKs on <c>prompt_products</c>
/// and <c>tracker_products</c> handle junction cleanup. The handler
/// verifies the product belongs to the supplied brand before deleting.
/// </summary>
public record RemoveBrandProductCommand(Guid BrandId, Guid ProductId) : IRequest;
