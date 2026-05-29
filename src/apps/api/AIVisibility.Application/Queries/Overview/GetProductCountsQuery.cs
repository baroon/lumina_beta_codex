using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Per-product mention counts for the current workspace + date window,
/// deduplicated by product name (case-insensitive) since the same name
/// may exist as multiple Product rows across brands / discovery runs.
/// Deliberately NOT scoped to any product filter — the FE chip stays
/// stable across selections. Mirrors GetTopicCountsQuery shape.
/// </summary>
public record GetProductCountsQuery(DateTime? From, DateTime? To)
    : IRequest<IReadOnlyList<ProductCountDto>>;

public sealed record ProductCountDto(
    /// <summary>Product name (the dedup unit).</summary>
    string ProductName,
    /// <summary>Number of mentions tied to answers whose prompt is tagged with this product.</summary>
    int MentionCount);
