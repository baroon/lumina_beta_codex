namespace AIVisibility.Application;

/// <summary>
/// Stable metric-name constants for trend rows written to the
/// <c>trend_points</c> table. Some are direct copies of
/// <see cref="MetricNames"/> entries (e.g. BrandMentionRate); others are
/// dashboard-specific derived/categorical metrics that don't appear in
/// the ScanMetric output (OwnedCitationShare, OverallSentiment, the
/// per-competitor MentionRate/RecommendationRate).
///
/// Lives in Application so both the aggregator (Infrastructure, writer)
/// and the dashboard read handlers (Application, readers) can share the
/// strings without re-declaring them.
/// </summary>
public static class TrendMetrics
{
    // -- Brand-side --

    /// <summary>FE-derived: owned citation count / total citation count, [0..1]. Null when total is zero.</summary>
    public const string OwnedCitationShare = "OwnedCitationShare";

    /// <summary>Categorical: mode of the BrandSentimentDistribution for the scan. Null when no signals had sentiment.</summary>
    public const string OverallSentiment = "OverallSentiment";

    // -- Competitor-side (Phase 4 v2) --

    /// <summary>Derived: per-competitor MentionCount / total scan answer count, [0..1]. Null when scan has zero answers.</summary>
    public const string MentionRate = "MentionRate";

    /// <summary>Derived: per-competitor RecommendationCount / MentionCount, [0..1]. Null when MentionCount is zero.</summary>
    public const string RecommendationRate = "RecommendationRate";
}
