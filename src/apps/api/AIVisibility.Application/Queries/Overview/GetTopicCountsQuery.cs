using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Per-topic mention counts for the current workspace + date window,
/// deduplicated by topic name (case-insensitive) since the same name may
/// exist as multiple Topic rows across brands / discovery runs.
/// Deliberately NOT scoped to any topic filter — the FE chip shows it
/// next to each row in the topic selector and stays stable across
/// selections.
/// </summary>
public record GetTopicCountsQuery(DateTime? From, DateTime? To)
    : IRequest<IReadOnlyList<TopicCountDto>>;

public sealed record TopicCountDto(
    /// <summary>Topic name (the dedup unit).</summary>
    string TopicName,
    /// <summary>Number of mentions tied to answers whose prompt is tagged with this topic.</summary>
    int MentionCount);
