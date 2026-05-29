using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Per-market mention counts for the current workspace + date window,
/// deduplicated by market name (case-insensitive) since the same name
/// may exist as multiple Market rows across brands / discovery runs.
/// Deliberately NOT scoped to any market filter — the FE chip stays
/// stable across selections. Mirrors GetTopicCountsQuery shape.
/// </summary>
public record GetMarketCountsQuery(DateTime? From, DateTime? To)
    : IRequest<IReadOnlyList<MarketCountDto>>;

public sealed record MarketCountDto(
    /// <summary>Market name (the dedup unit).</summary>
    string MarketName,
    /// <summary>Number of mentions tied to answers whose prompt is tagged with this market.</summary>
    int MentionCount);
