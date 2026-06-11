using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class AddBrandProductCommandHandler
    : IRequestHandler<AddBrandProductCommand, AddBrandProductResult>
{
    private readonly IAppDbContext _db;

    public AddBrandProductCommandHandler(IAppDbContext db) => _db = db;

    public async Task<AddBrandProductResult> Handle(
        AddBrandProductCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Product name cannot be empty.");

        var brand = await _db.Brands.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        var existing = await _db.Products.AsNoTracking()
            .Where(p => p.BrandId == brand.Id)
            .Select(p => p.Name)
            .ToListAsync(cancellationToken);
        if (existing.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Product '{name}' already exists on this brand.");

        var latestRunId = await _db.DiscoveryRuns.AsNoTracking()
            .Where(r => r.BrandId == brand.Id)
            .OrderByDescending(r => r.StartedAt)
            .Select(r => (Guid?)r.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "Brand has no DiscoveryRun to anchor the new product to. Run discovery first.");

        var product = new Product
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            DiscoveryRunId = latestRunId,
            Name = name,
            Aliases = new List<string>(),
            Description = null,
            ProductType = ProductType.Product,
            Confidence = 1.0,
            Source = CandidateSource.UserAdded,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Products.Add(product);
        await _db.SaveChangesAsync(cancellationToken);

        return new AddBrandProductResult(product.Id, product.Name);
    }
}
