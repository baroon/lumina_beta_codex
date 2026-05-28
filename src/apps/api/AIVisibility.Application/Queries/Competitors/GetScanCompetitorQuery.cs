using MediatR;

namespace AIVisibility.Application.Queries.Competitors;

/// <summary>
/// Competitor detail query (Phase 4 v1 plan §Slice 4, D17). Returns the
/// pre-computed Competitor-scope metrics plus the set of sources cited on
/// answers that mentioned this competitor — surfaces which sources are
/// referenced when AI assistants discuss the competitor. Handler returns
/// null when the scan or competitor does not exist.
/// </summary>
public record GetScanCompetitorQuery(Guid ScanRunId, Guid CompetitorId)
    : IRequest<ScanCompetitorDetailDto?>;

public sealed record ScanCompetitorDetailDto(
    Guid ScanRunId,
    Guid CompetitorId,
    string Name,
    string? Domain,
    CompetitorMetricsDto Metrics,
    IReadOnlyList<CompetitorMentionSourceDto> SourcesMentioningCompetitor);

public sealed record CompetitorMetricsDto(
    int MentionCount,
    int RecommendationCount,
    double? MentionRate,
    double? RecommendationRate);

/// <summary>
/// A source that was cited on at least one answer where this competitor was
/// mentioned. Count is the number of citations of this source within those
/// competitor-mention answers.
/// </summary>
public sealed record CompetitorMentionSourceDto(
    Guid SourceId,
    string SourceName,
    string? NormalizedDomain,
    int CitationCount);
