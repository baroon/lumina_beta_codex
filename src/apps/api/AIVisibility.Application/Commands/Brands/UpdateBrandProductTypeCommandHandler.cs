using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandProductTypeCommandHandler
    : IRequestHandler<UpdateBrandProductTypeCommand, UpdateBrandProductTypeResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandProductTypeCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandProductTypeResult> Handle(
        UpdateBrandProductTypeCommand request, CancellationToken cancellationToken)
    {
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new InvalidOperationException($"Product {request.ProductId} not found.");

        if (product.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Product {request.ProductId} does not belong to brand {request.BrandId}.");

        product.ProductType = request.ProductType;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandProductTypeResult(request.ProductType);
    }
}
