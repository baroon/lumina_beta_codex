using MediatR;

namespace AIVisibility.Application.Queries.Scans;

/// <summary>
/// Reporting query for the Scan Results page (REQ-004 / KANBAN-004).
/// Returns the pivoted view of the scan's persisted ScanMetric rows plus
/// scan metadata. Handler returns null when the scan or its AnalysisJob
/// does not exist; the controller maps that to 404.
/// </summary>
public record GetScanResultsQuery(Guid ScanRunId) : IRequest<ScanResultsDto?>;

// ============================================================================
// Top-level
// ============================================================================

public sealed record ScanResultsDto(
    Guid ScanRunId,
    ScanSummaryDto Summary,
    CoreMetricsDto CoreMetrics,
    BreakdownsDto Breakdowns);

// ============================================================================
// Scan summary — identity + status + counts (REQ-004 §Scan Summary)
// ============================================================================

public sealed record ScanSummaryDto(
    Guid TrackerId,
    string TrackerName,
    Guid BrandId,
    string BrandName,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string ScanStatus,                  // ScanRunStatus.ToString()
    string AnalysisStatus,              // AnalysisJobStatus.ToString()
    string? AnalysisError,
    int ScanCheckCount,
    int CompletedCount,
    int FailedCount,
    IReadOnlyList<PlatformDto> Platforms);

public sealed record PlatformDto(
    Guid PlatformId,
    string Code,
    string Name);

// ============================================================================
// Core metrics — Overall-scope metric pivot (REQ-004 §Core Metrics)
// ============================================================================

public sealed record CoreMetricsDto(
    // Brand-centric rates and averages. Nullable because Slice (c) skips them
    // when the underlying signal set has no data (e.g. SoV with zero
    // brand+competitor mentions, or AverageBrandRank with no ranked signals).
    double? BrandMentionRate,
    double? BrandRecommendationRate,
    double? BrandShareOfVoice,
    double? AverageBrandRank,
    // Mention counts.
    int CompetitorMentionCount,
    int ProductMentionCount,
    // Citation counts. The four classification counts sum to CitationCount —
    // invariant locked by MetricAggregator.
    int CitationCount,
    int OwnedCitationCount,
    int CompetitorCitationCount,
    int ThirdPartyCitationCount,
    int UnknownCitationCount,
    // Brand sentiment distribution as a dict so the frontend can render
    // a pie chart directly. Only observed sentiment values appear as keys.
    IReadOnlyDictionary<string, int> BrandSentimentDistribution,
    // Top-5 cited sources sorted by rank.
    IReadOnlyList<TopCitedSourceDto> TopCitedSources);

public sealed record TopCitedSourceDto(
    int Rank,
    string SourceName,
    int CitationCount);

// ============================================================================
// Breakdowns — per-dimension cuts (REQ-004 §Breakdown Charts)
// ============================================================================

public sealed record BreakdownsDto(
    IReadOnlyList<PlatformBreakdownDto> ByPlatform,
    IReadOnlyList<LensBreakdownDto> ByLens,
    IReadOnlyList<TopicBreakdownDto> ByTopic,
    IReadOnlyList<CompetitorBreakdownDto> ByCompetitor);

public sealed record PlatformBreakdownDto(
    Guid PlatformId,
    string PlatformName,
    double? BrandMentionRate,
    double? BrandRecommendationRate,
    double? BrandShareOfVoice,
    int CitationCount,
    IReadOnlyDictionary<string, int> BrandSentimentDistribution);

public sealed record LensBreakdownDto(
    Guid LensId,
    string LensName,
    double? BrandMentionRate,
    double? BrandRecommendationRate,
    double? BrandShareOfVoice,
    int CitationCount,
    IReadOnlyDictionary<string, int> BrandSentimentDistribution);

public sealed record TopicBreakdownDto(
    Guid TopicId,
    string TopicName,
    double? BrandMentionRate,
    double? BrandRecommendationRate,
    double? BrandShareOfVoice,
    int CitationCount);

public sealed record CompetitorBreakdownDto(
    Guid CompetitorId,
    string CompetitorName,
    int MentionCount,
    int RecommendationCount);
