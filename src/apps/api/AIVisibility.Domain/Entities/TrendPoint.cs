using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// One pre-computed trend datum per (tracker, scan, entity, metric) for the
/// Visibility Tracker dashboard (Phase 4 v2 — extended in D1/D3). Captures
/// both numeric metrics (rates, counts, averages) via <see cref="NumericValue"/>
/// and categorical metrics (sentiment mode) via <see cref="CategoricalValue"/>
/// — exactly one of those is non-null per row.
///
/// The <see cref="EntityType"/> + <see cref="EntityId"/> pair identifies
/// which brand or competitor the metric measures: a single scan now writes
/// one trend point per (entity × metric) so the multi-line dashboard chart
/// can render one series per tracked entity. Polymorphic — no FK because
/// the target table depends on <see cref="EntityType"/> (mirrors the
/// <c>Mention.EntityType + EntityId</c> shape).
///
/// Written by the metric-aggregation pipeline after a scan's ScanMetrics
/// persist (denormalization for fast cross-scan trend queries). Re-derivable
/// from ScanMetric + Mention rows at any time if a backfill is needed.
/// </summary>
public class TrendPoint
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public Guid ScanRunId { get; set; }

    /// <summary>
    /// Which side of the analysis this trend measures — brand or competitor.
    /// Drives which table <see cref="EntityId"/> points at.
    /// </summary>
    public TrendEntityType EntityType { get; set; }

    /// <summary>
    /// FK-by-convention to either <c>brands.id</c> (when
    /// <see cref="EntityType"/> is <see cref="TrendEntityType.Brand"/>) or
    /// <c>competitors.id</c> (when <see cref="TrendEntityType.Competitor"/>).
    /// </summary>
    public Guid EntityId { get; set; }

    /// <summary>
    /// The trend metric name. Stable enum-like string so the dashboard can
    /// look up the right chart per metric.
    /// </summary>
    public string MetricName { get; set; } = string.Empty;

    /// <summary>
    /// Numeric value for rates / counts / averages. Null for categorical
    /// metrics. May also be null when the source metric was skipped by the
    /// aggregator (e.g. SoV with denominator zero, AverageBrandRank with no
    /// ranked signals, RecommendationRate when MentionCount=0).
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
