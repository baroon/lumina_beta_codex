using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Adds a user-authored market to a brand. Same shape as the topic /
/// competitor commands. CountryCode defaults to null — manually added
/// markets don't carry a flag until a deeper edit surface lands.
/// </summary>
public record AddBrandMarketCommand(Guid BrandId, string Name) : IRequest<AddBrandMarketResult>;

public sealed record AddBrandMarketResult(Guid MarketId, string Name);
