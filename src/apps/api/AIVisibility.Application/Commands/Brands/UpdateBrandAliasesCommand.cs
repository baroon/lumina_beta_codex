using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Replaces the brand's alias list. The handler trims each entry,
/// drops empties, deduplicates case-insensitively, and rejects any
/// alias that collides with the brand's primary name (matching how
/// downstream mention detection treats name + aliases as one set).
/// Empty alias list is valid — a brand may legitimately have no
/// "also known as" entries.
/// </summary>
public record UpdateBrandAliasesCommand(
    Guid BrandId,
    IReadOnlyList<string> Aliases) : IRequest<UpdateBrandAliasesResult>;

public sealed record UpdateBrandAliasesResult(IReadOnlyList<string> Aliases);
