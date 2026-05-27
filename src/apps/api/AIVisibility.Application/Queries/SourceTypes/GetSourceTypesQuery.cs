using MediatR;

namespace AIVisibility.Application.Queries.SourceTypes;

/// <summary>
/// Reference-table query for the 12-value SourceType taxonomy (Phase 4 v1
/// plan §D12). Frontend caches the result and uses it to populate the
/// editable dropdown on the Source/Citation view (D20).
/// </summary>
public record GetSourceTypesQuery() : IRequest<IReadOnlyList<SourceTypeReferenceDto>>;

public sealed record SourceTypeReferenceDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    int DisplayOrder);
