using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandAliasesCommandHandler
    : IRequestHandler<UpdateBrandAliasesCommand, UpdateBrandAliasesResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandAliasesCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandAliasesResult> Handle(
        UpdateBrandAliasesCommand request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        // Trim, drop empties, case-insensitive dedup preserving first-seen order.
        var normalized = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in request.Aliases)
        {
            var trimmed = raw?.Trim();
            if (string.IsNullOrEmpty(trimmed)) continue;
            if (string.Equals(trimmed, brand.Name, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"Alias '{trimmed}' collides with the brand's primary name.");
            if (seen.Add(trimmed)) normalized.Add(trimmed);
        }

        brand.Aliases = normalized;
        brand.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandAliasesResult(normalized);
    }
}
