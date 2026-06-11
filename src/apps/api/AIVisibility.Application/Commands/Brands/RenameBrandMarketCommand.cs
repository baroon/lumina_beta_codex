using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>Renames an existing brand market — same shape as RenameBrandTopicCommand.</summary>
public record RenameBrandMarketCommand(Guid BrandId, Guid MarketId, string Name)
    : IRequest<RenameBrandMarketResult>;

public sealed record RenameBrandMarketResult(Guid MarketId, string Name);
