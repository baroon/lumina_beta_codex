using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RemoveBrandProductCommandHandler : IRequestHandler<RemoveBrandProductCommand>
{
    private readonly IAppDbContext _db;

    public RemoveBrandProductCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(
        RemoveBrandProductCommand request, CancellationToken cancellationToken)
    {
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new InvalidOperationException($"Product {request.ProductId} not found.");

        if (product.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Product {request.ProductId} does not belong to brand {request.BrandId}.");

        _db.Products.Remove(product);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
