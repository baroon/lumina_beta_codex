using MediatR;

namespace AIVisibility.Application.Queries.Topics;

/// <summary>
/// Topic view list query (Phase 4 v1 plan §Slice 3, D16). Pivots
/// <c>ScanMetric.Scope=Topic</c> rows into one row per topic — the same
/// pre-computed metrics the Overall scope uses, sliced by topic-mapped
/// prompts. Handler returns null when the scan does not exist.
/// </summary>
public record GetScanTopicsQuery(Guid ScanRunId) : IRequest<ScanTopicsDto?>;

public sealed record ScanTopicsDto(
    Guid ScanRunId,
    IReadOnlyList<TopicListItemDto> Topics);

public sealed record TopicListItemDto(
    Guid TopicId,
    string TopicName,
    // Nullable rate fields mirror the Slice (c) emission rules — the
    // aggregator skips the metric when its denominator is zero (e.g. SoV
    // when no brand+competitor mentions, AverageBrandRank when no ranked
    // signals). null distinguishes missing data from a real zero.
    double? BrandMentionRate,
    double? BrandRecommendationRate,
    double? BrandShareOfVoice,
    double? AverageBrandRank,
    int CitationCount,
    /// <summary>Owned citations / total citations within this topic, [0..1]. Null when CitationCount=0.</summary>
    double? OwnedCitationShare,
    /// <summary>Mode of BrandSentimentDistribution for this topic — the most-observed sentiment value. Null when the topic has no signals.</summary>
    string? DominantSentiment);
