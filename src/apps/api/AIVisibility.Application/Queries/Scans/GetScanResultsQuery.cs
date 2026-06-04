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
    /// <summary>
    /// Lead share — fraction of answers (with ≥1 mention) where the brand
    /// was the first-named entity by position. Phase 4 measurement-model
    /// expansion. Null when no answers had any mentions in scope.
    /// </summary>
    double? BrandFirstMentionRate,
    /// <summary>
    /// Mean recommendation score (Phase 4 measurement-model expansion),
    /// range [-1.0, +1.0]. Null when no answers in scope had the brand
    /// mentioned — same denominator-zero pattern as BrandShareOfVoice.
    /// </summary>
    double? BrandRecommendationScore,
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
    IReadOnlyList<TopCitedSourceDto> TopCitedSources,
    /// <summary>
    /// Top-N attributes (Phase 4 measurement-model expansion) the AI
    /// ascribed to the brand at Overall scope. Sorted by rank ascending.
    /// Empty when no brand attributes were extracted from any answer.
    /// </summary>
    IReadOnlyList<BrandAttributeDto> TopBrandAttributes);

public sealed record TopCitedSourceDto(
    int Rank,
    string SourceName,
    int CitationCount);

/// <summary>
/// One attribute the AI ascribed to the brand at this scope, rolled up
/// across the scan (Phase 4 measurement-model expansion, item #10).
/// Polarity is the modal polarity across the attribute's mentions in
/// scope. Mention count is the raw aggregator value.
/// </summary>
public sealed record BrandAttributeDto(
    int Rank,
    string Name,
    string Polarity,
    int MentionCount);

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
