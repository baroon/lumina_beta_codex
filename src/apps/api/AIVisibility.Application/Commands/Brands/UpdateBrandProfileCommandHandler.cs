using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandProfileCommandHandler
    : IRequestHandler<UpdateBrandProfileCommand, UpdateBrandProfileResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandProfileCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandProfileResult> Handle(
        UpdateBrandProfileCommand request, CancellationToken cancellationToken)
    {
        var profile = await _db.BrandProfiles
            .Include(p => p.Brand)
            .FirstOrDefaultAsync(p => p.BrandId == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"No BrandProfile for brand {request.BrandId}. Discovery must complete first.");

        profile.ShortDescription = Normalize(request.ShortDescription);
        profile.Industry = Normalize(request.Industry);
        profile.Category = Normalize(request.Category);
        profile.Positioning = Normalize(request.Positioning);
        profile.UpdatedAt = DateTime.UtcNow;
        // Brand.UpdatedAt also advances so list views show the brand as
        // recently touched.
        if (profile.Brand != null) profile.Brand.UpdatedAt = profile.UpdatedAt;

        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandProfileResult(
            profile.ShortDescription,
            profile.Industry,
            profile.Category,
            profile.Positioning);
    }

    private static string? Normalize(string? raw)
    {
        if (raw == null) return null;
        var trimmed = raw.Trim();
        return trimmed.Length == 0 ? null : trimmed;
    }
}
