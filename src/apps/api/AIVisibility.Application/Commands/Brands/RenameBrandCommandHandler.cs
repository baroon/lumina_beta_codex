using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AIVisibility.Application.Commands.Brands;

public class RenameBrandCommandHandler : IRequestHandler<RenameBrandCommand, RenameBrandResult>
{
    private readonly IAppDbContext _db;

    public RenameBrandCommandHandler(IAppDbContext db) => _db = db;

    public async Task<RenameBrandResult> Handle(
        RenameBrandCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Brand name cannot be empty.");

        var brand = await _db.Brands
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        // No-op when the trimmed name matches what's already stored.
        if (string.Equals(brand.Name, name, StringComparison.Ordinal))
            return new RenameBrandResult(brand.Id, brand.Name);

        // Case-insensitive lookup against the brand's workspace. Mirrors
        // the DB unique index on (workspace_id, lower(name)); a concurrent
        // writer is caught by the catch below.
        var lowered = name.ToLowerInvariant();
        var clash = await _db.Brands.AsNoTracking()
            .AnyAsync(
                b => b.WorkspaceId == brand.WorkspaceId
                    && b.Id != brand.Id
                    && b.Name.ToLower() == lowered,
                cancellationToken);
        if (clash)
            throw new DuplicateBrandNameException(name);

        brand.Name = name;
        brand.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new DuplicateBrandNameException(name);
        }

        return new RenameBrandResult(brand.Id, brand.Name);
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation;
}
