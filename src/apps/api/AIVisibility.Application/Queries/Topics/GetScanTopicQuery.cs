using MediatR;

namespace AIVisibility.Application.Queries.Topics;

/// <summary>
/// Topic detail query (Phase 4 v1 plan §Slice 3, D16). Returns the
/// topic's pre-computed metrics + a runtime sub-aggregation that slices
/// the same brand-mention / SoV / citation metrics by platform within
/// this topic + a top-cited-sources list scoped to this topic. Handler
/// returns null when the scan or topic does not exist.
/// </summary>
public record GetScanTopicQuery(Guid ScanRunId, Guid TopicId) : IRequest<ScanTopicDetailDto?>;

public sealed record ScanTopicDetailDto(
    Guid ScanRunId,
    Guid TopicId,
    string TopicName,
    TopicMetricsDto Metrics,
    IReadOnlyList<TopicPlatformBreakdownDto> ByPlatform,
    IReadOnlyList<TopicTopCitedSourceDto> TopCitedSources);

public sealed record TopicMetricsDto(
    double? BrandMentionRate,
    double? BrandRecommendationRate,
    double? BrandShareOfVoice,
    double? AverageBrandRank,
    int CitationCount,
    int OwnedCitationCount,
    int CompetitorCitationCount,
    int ThirdPartyCitationCount,
    int UnknownCitationCount,
    IReadOnlyDictionary<string, int> BrandSentimentDistribution);

/// <summary>
/// Per-platform metrics within this topic. Runtime sub-aggregation —
/// the aggregator never emits Topic×Platform compound rows, so this
/// handler computes it on demand by filtering AIAnswers to those whose
/// prompt is mapped to this topic AND whose prompt-run is on the
/// platform in question.
/// </summary>
public sealed record TopicPlatformBreakdownDto(
    Guid PlatformId,
    string PlatformCode,
    string PlatformName,
    int AnswerCount,
    double? BrandMentionRate,
    double? BrandRecommendationRate,
    double? BrandShareOfVoice,
    int CitationCount);

public sealed record TopicTopCitedSourceDto(
    Guid SourceId,
    string SourceName,
    int CitationCount);
