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
    /// Average size of the ranked list the brand was ranked against
    /// (Phase 4 measurement-model expansion, item 3). Companion to
    /// AverageBrandRank — lets the FE show "rank 3 of ~7". Null when
    /// no ranked answers in scope reported a universe size.
    /// </summary>
    double? AverageBrandRankUniverseSize,
    /// <summary>
    /// Mean recommendation score (Phase 4 measurement-model expansion),
    /// range [-1.0, +1.0]. Null when no answers in scope had the brand
    /// mentioned — same denominator-zero pattern as BrandShareOfVoice.
    /// </summary>
    double? BrandRecommendationScore,
    /// <summary>
    /// Brand's share of all recommendations in the scan (Phase 4
    /// measurement-model expansion, item 19). Distinct from
    /// BrandRecommendationRate (per-answer). Null when no entities were
    /// recommended in scope.
    /// </summary>
    double? BrandRecommendationShare,
    /// <summary>
    /// Fraction of answers where the brand was entirely absent — not
    /// mentioned in body AND not cited as an owned source. Stricter than
    /// (1 - BrandMentionRate) and a better "we're invisible" KPI. Null
    /// when the scope has no answers.
    /// </summary>
    double? BrandAbsenceRate,
    /// <summary>
    /// Mean answer-certainty across all answers (Phase 4 item 12). Range
    /// [0, 1]. Null only when the scan has no answers.
    /// </summary>
    double? AverageAnswerCertainty,
    /// <summary>
    /// Fraction of answers with ≥1 recommendation where the brand is the
    /// AI's top pick (Phase 4 item 6). Range [0, 1]. Null when no answers
    /// in scope had any recommendations.
    /// </summary>
    double? BrandTopRecommendationShare,
    /// <summary>
    /// Average position of the brand in answers where it appeared in the
    /// recommendation list. Lower = stronger endorsement. Null when the
    /// brand never appeared in any recommendation list.
    /// </summary>
    double? AverageBrandRecommendationPosition,
    /// <summary>
    /// Count of risk flags attached to brand mentions in scope (Phase 4
    /// item 11). Risk flags catch warning language like "however, recent
    /// layoffs..." that pollutes an otherwise-positive answer. Always
    /// emitted (zero is a legitimate signal).
    /// </summary>
    int BrandRiskFlagCount,
    /// <summary>
    /// Head-to-head comparisons the brand wins on the named aspect
    /// (Phase 4 item 15).
    /// </summary>
    int BrandWinningComparisonCount,
    /// <summary>
    /// Head-to-head comparisons the brand loses on the named aspect.
    /// Wins minus losses is the directed comparative-framing signal.
    /// </summary>
    int BrandLosingComparisonCount,
    /// <summary>
    /// Structured "Recommended for X" context entries attached to brand
    /// mentions in scope (Phase 4 item 2).
    /// </summary>
    int BrandRecommendedForCount,
    /// <summary>
    /// "With caveats" context entries — how many qualifying limitations
    /// the AI attached to brand mentions.
    /// </summary>
    int BrandWithCaveatsCount,
    /// <summary>
    /// Count of per-topic rows where the brand IS recommended for the
    /// named topic (Phase 4 item 13).
    /// </summary>
    int BrandTopicRecommendedCount,
    /// <summary>
    /// Count of per-topic rows where the brand is explicitly NOT
    /// recommended for the named topic.
    /// </summary>
    int BrandTopicNotRecommendedCount,
    /// <summary>
    /// Change in BrandMentionRate vs the previous completed scan (current -
    /// previous). Null when this is the tracker's first scan. Range
    /// [-1.0, +1.0]. Phase 4 measurement-model expansion (item 20).
    /// </summary>
    double? BrandMentionRateMomentum,
    /// <summary>
    /// Change in BrandShareOfVoice vs the previous completed scan. Same
    /// null/range semantics as BrandMentionRateMomentum.
    /// </summary>
    double? BrandShareOfVoiceMomentum,
    /// <summary>
    /// Change in BrandAbsenceRate vs the previous completed scan. NOTE:
    /// inverse direction — a positive value means the brand is now absent
    /// from MORE answers. Same null/range semantics.
    /// </summary>
    double? BrandAbsenceRateMomentum,
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
    int RecommendationCount,
    /// <summary>
    /// Share of voice for this competitor — mentions / (brand + competitor
    /// mentions across the scan). Range [0, 1]. Null only when no
    /// CompetitorShareOfVoice row exists for this competitor in scan_metrics
    /// (mirrors the aggregator's denominator-unreachable guard).
    /// </summary>
    double? ShareOfVoice,
    /// <summary>
    /// Share of recommendations for this competitor — recommended mentions /
    /// total recommended (brand + competitor) mentions across the scan.
    /// Range [0, 1]. Null when nobody in the scan was recommended (no
    /// CompetitorRecommendationShare metric row exists in that case).
    /// </summary>
    double? RecommendationShare);
