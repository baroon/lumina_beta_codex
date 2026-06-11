using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RenameBrandProductCommandHandler
    : IRequestHandler<RenameBrandProductCommand, RenameBrandProductResult>
{
    private readonly IAppDbContext _db;

    public RenameBrandProductCommandHandler(IAppDbContext db) => _db = db;

    public async Task<RenameBrandProductResult> Handle(
        RenameBrandProductCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Product name cannot be empty.");

        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new InvalidOperationException($"Product {request.ProductId} not found.");

        if (product.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Product {request.ProductId} does not belong to brand {request.BrandId}.");

        if (string.Equals(product.Name, name, StringComparison.Ordinal))
            return new RenameBrandProductResult(product.Id, product.Name);

        var clash = await _db.Products.AsNoTracking()
            .Where(p => p.BrandId == request.BrandId && p.Id != product.Id)
            .Select(p => p.Name)
            .ToListAsync(cancellationToken);
        if (clash.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Product '{name}' already exists on this brand.");

        product.Name = name;
        await _db.SaveChangesAsync(cancellationToken);

        return new RenameBrandProductResult(product.Id, product.Name);
    }
}
