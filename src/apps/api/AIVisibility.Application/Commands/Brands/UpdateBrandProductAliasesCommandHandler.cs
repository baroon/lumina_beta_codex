using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandProductAliasesCommandHandler
    : IRequestHandler<UpdateBrandProductAliasesCommand, UpdateBrandProductAliasesResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandProductAliasesCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandProductAliasesResult> Handle(
        UpdateBrandProductAliasesCommand request, CancellationToken cancellationToken)
    {
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new InvalidOperationException($"Product {request.ProductId} not found.");

        if (product.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Product {request.ProductId} does not belong to brand {request.BrandId}.");

        // Trim, drop empties, case-insensitive dedup preserving first-seen order.
        var normalized = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in request.Aliases)
        {
            var trimmed = raw?.Trim();
            if (string.IsNullOrEmpty(trimmed)) continue;
            if (string.Equals(trimmed, product.Name, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"Alias '{trimmed}' collides with the product's primary name.");
            if (seen.Add(trimmed)) normalized.Add(trimmed);
        }

        product.Aliases = normalized;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandProductAliasesResult(normalized);
    }
}
