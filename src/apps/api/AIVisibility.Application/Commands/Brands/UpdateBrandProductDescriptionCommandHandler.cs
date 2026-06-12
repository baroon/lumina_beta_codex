using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandProductDescriptionCommandHandler
    : IRequestHandler<UpdateBrandProductDescriptionCommand, UpdateBrandProductDescriptionResult>
{
    private const int MaxLength = 2000;
    private readonly IAppDbContext _db;

    public UpdateBrandProductDescriptionCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandProductDescriptionResult> Handle(
        UpdateBrandProductDescriptionCommand request, CancellationToken cancellationToken)
    {
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new InvalidOperationException($"Product {request.ProductId} not found.");

        if (product.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Product {request.ProductId} does not belong to brand {request.BrandId}.");

        var trimmed = request.Description?.Trim();
        var normalized = string.IsNullOrEmpty(trimmed) ? null : trimmed;

        if (normalized?.Length > MaxLength)
            throw new InvalidOperationException(
                $"Description must be {MaxLength} characters or fewer (got {normalized.Length}).");

        product.Description = normalized;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandProductDescriptionResult(normalized);
    }
}
