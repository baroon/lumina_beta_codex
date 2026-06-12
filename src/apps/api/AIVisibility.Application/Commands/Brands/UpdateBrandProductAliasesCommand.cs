using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Replaces the alias list on a single brand product. Mirrors
/// <see cref="UpdateBrandCompetitorAliasesCommand"/>: trim each, drop
/// empties, case-insensitive dedup preserving first-seen casing, reject
/// any alias that collides with the product's own name (mention
/// detection treats name + aliases as one set; a duplicate would
/// inflate match counts). Verifies per-brand ownership before write
/// so a stale FE cannot retarget another brand's product by guessing
/// the ID.
/// </summary>
public record UpdateBrandProductAliasesCommand(
    Guid BrandId,
    Guid ProductId,
    IReadOnlyList<string> Aliases) : IRequest<UpdateBrandProductAliasesResult>;

public sealed record UpdateBrandProductAliasesResult(IReadOnlyList<string> Aliases);
