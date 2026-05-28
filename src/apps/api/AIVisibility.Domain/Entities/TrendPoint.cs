namespace AIVisibility.Domain.Entities;

/// <summary>
/// One pre-computed trend datum per (tracker, scan, metric) for the
/// Visibility Tracker dashboard (Phase 4 Slice 6). Captures both numeric
/// metrics (rates, counts, averages) via <see cref="NumericValue"/> and
/// categorical metrics (sentiment mode) via <see cref="CategoricalValue"/>
/// — exactly one of those is non-null per row.
///
/// Written by the metric-aggregation pipeline after a scan's ScanMetrics
/// persist (denormalization for fast cross-scan trend queries). Re-derivable
/// from ScanMetric at any time if a backfill is needed.
/// </summary>
public class TrendPoint
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public Guid ScanRunId { get; set; }

    /// <summary>
    /// The trend metric name. Stable enum-like string so the dashboard can
    /// look up the right chart per metric. v1 values: BrandMentionRate,
    /// BrandRecommendationRate, BrandShareOfVoice, OwnedCitationShare,
    /// AverageBrandRank, OverallSentiment.
    /// </summary>
    public string MetricName { get; set; } = string.Empty;

    /// <summary>
    /// Numeric value for rates / counts / averages. Null for categorical
    /// metrics. May also be null when the source metric was skipped by the
    /// aggregator (e.g. SoV with denominator zero, AverageBrandRank with no
    /// ranked signals).
    /// </summary>
    public double? NumericValue { get; set; }

    /// <summary>
    /// Categorical value (e.g. sentiment mode "Positive"). Null for numeric
    /// metrics. Null when the source metric had no data to derive a category
    /// from.
    /// </summary>
    public string? CategoricalValue { get; set; }

    /// <summary>
    /// Effective timestamp for the trend point — uses the scan's
    /// CompletedAt so dashboard ordering reflects when data is observable
    /// to the user, not when the row was written.
    /// </summary>
    public DateTime CapturedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
