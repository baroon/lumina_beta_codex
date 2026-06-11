using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandWebsiteUrlCommandHandler
    : IRequestHandler<UpdateBrandWebsiteUrlCommand, UpdateBrandWebsiteUrlResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandWebsiteUrlCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandWebsiteUrlResult> Handle(
        UpdateBrandWebsiteUrlCommand request, CancellationToken cancellationToken)
    {
        var raw = request.WebsiteUrl?.Trim();
        if (string.IsNullOrEmpty(raw))
            throw new InvalidOperationException("Website URL cannot be empty.");

        // Require an absolute http(s) URL — the only shape the crawler
        // exercises. Schemes like file:// or chrome:// are rejected even
        // though Uri.TryCreate would otherwise accept them.
        if (!Uri.TryCreate(raw, UriKind.Absolute, out var parsed)
            || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
            throw new InvalidOperationException(
                $"Website URL must be an absolute http(s) URL. Got: {raw}");

        var brand = await _db.Brands
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        if (string.Equals(brand.WebsiteUrl, raw, StringComparison.Ordinal))
            return new UpdateBrandWebsiteUrlResult(brand.Id, brand.WebsiteUrl);

        brand.WebsiteUrl = raw;
        brand.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandWebsiteUrlResult(brand.Id, brand.WebsiteUrl);
    }
}
