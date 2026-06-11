using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Removes a market from a brand. Cascade FKs on <c>prompt_markets</c>
/// and <c>tracker_markets</c> handle junction cleanup. The handler
/// verifies the market belongs to the supplied brand before deleting.
/// </summary>
public record RemoveBrandMarketCommand(Guid BrandId, Guid MarketId) : IRequest;
