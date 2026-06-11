using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Replaces the alias list on a single brand competitor. Mirrors
/// <see cref="UpdateBrandAliasesCommand"/>: trim each, drop empties,
/// case-insensitive dedup preserving first-seen casing, reject any
/// alias that collides with the competitor's own name (mention
/// detection treats name + aliases as one set; a duplicate would
/// inflate match counts). Verifies per-brand ownership before write
/// so a stale FE cannot retarget another brand's competitor by
/// guessing the ID.
/// </summary>
public record UpdateBrandCompetitorAliasesCommand(
    Guid BrandId,
    Guid CompetitorId,
    IReadOnlyList<string> Aliases) : IRequest<UpdateBrandCompetitorAliasesResult>;

public sealed record UpdateBrandCompetitorAliasesResult(IReadOnlyList<string> Aliases);
