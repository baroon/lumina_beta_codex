using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class DeleteBrandCommandHandler : IRequestHandler<DeleteBrandCommand>
{
    private readonly IAppDbContext _db;

    public DeleteBrandCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(DeleteBrandCommand request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        _db.Brands.Remove(brand);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
