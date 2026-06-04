using MediatR;

namespace AIVisibility.Application.Queries.Competitors;

/// <summary>
/// Competitor view list query (Phase 4 v1 plan §Slice 4, D17). Pivots
/// pre-computed <c>ScanMetric.Scope=Competitor</c> rows into one row per
/// competitor — the aggregator emits <c>MentionCount</c> and
/// <c>RecommendationCount</c> at this scope. Mention rate is derived from
/// the scan's total successful answer count so the table can show rate
/// alongside count. Handler returns null when the scan does not exist.
/// </summary>
public record GetScanCompetitorsQuery(Guid ScanRunId) : IRequest<ScanCompetitorsDto?>;

public sealed record ScanCompetitorsDto(
    Guid ScanRunId,
    IReadOnlyList<CompetitorListItemDto> Competitors);

public sealed record CompetitorListItemDto(
    Guid CompetitorId,
    string Name,
    string? Domain,
    int MentionCount,
    int RecommendationCount,
    /// <summary>MentionCount / total scan answer count, [0..1]. Null when the scan has no successful answers.</summary>
    double? MentionRate,
    /// <summary>RecommendationCount / MentionCount when MentionCount &gt; 0; null otherwise — recommendation only makes sense once mentioned.</summary>
    double? RecommendationRate,
    /// <summary>
    /// Share of voice for this competitor — its mentions / (brand + competitor
    /// mentions across the scan). Distinct from MentionRate (which uses answer
    /// count as denominator). Null when the CompetitorShareOfVoice metric row
    /// is absent for this competitor.
    /// </summary>
    double? ShareOfVoice,
    /// <summary>
    /// Share of recommendations for this competitor — recommended mentions /
    /// total recommended (brand + competitor) mentions across the scan.
    /// Null when nobody was recommended in the scan (the metric row is not
    /// emitted in that case).
    /// </summary>
    double? RecommendationShare);
