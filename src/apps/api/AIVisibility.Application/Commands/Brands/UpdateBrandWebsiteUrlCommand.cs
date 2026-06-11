using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Updates a brand's <c>WebsiteUrl</c>. Trims input, rejects empty,
/// validates that the result is an absolute http(s) URL (the only
/// shape the discovery crawler ever exercises). Advances UpdatedAt.
/// Unlike the brand alias / topic / dimension edits, this field
/// already lives directly on the Brand row — no junction or owning
/// DiscoveryRun to anchor against.
/// </summary>
public record UpdateBrandWebsiteUrlCommand(Guid BrandId, string WebsiteUrl)
    : IRequest<UpdateBrandWebsiteUrlResult>;

public sealed record UpdateBrandWebsiteUrlResult(Guid BrandId, string WebsiteUrl);
