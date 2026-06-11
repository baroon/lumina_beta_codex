using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Renames a brand. Trims input, rejects empty, no-ops when the trimmed
/// name matches what's stored (FE may submit an unchanged value on
/// click-away), enforces case-insensitive uniqueness within the brand's
/// workspace (matching the DB unique index), and advances UpdatedAt.
/// The API layer maps <see cref="DuplicateBrandNameException"/> to 409.
/// </summary>
public record RenameBrandCommand(Guid BrandId, string Name) : IRequest<RenameBrandResult>;

public sealed record RenameBrandResult(Guid BrandId, string Name);
