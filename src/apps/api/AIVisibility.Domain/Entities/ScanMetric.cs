using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// One aggregate metric row for a scan (Phase 3 plan §3, D15). Generic row-
/// per-metric shape with a <see cref="ScanMetricScope"/> + <see cref="ScopeId"/>
/// pair identifying the dimension being summarised, a string
/// <see cref="MetricName"/> (use the <c>MetricNames</c> constants for compile-
/// time-ish safety), and a double <see cref="MetricValue"/>. Optional
/// <see cref="MetadataJson"/> carries metric-specific context (e.g. the
/// denominator that produced a rate).
///
/// Append-only (D16). Cascade-deleted with its <see cref="ScanRun"/> (D17).
/// </summary>
public class ScanMetric
{
    public Guid Id { get; set; }
    public Guid ScanRunId { get; set; }

    public ScanMetricScope Scope { get; set; }
    /// <summary>
    /// Polymorphic per <see cref="Scope"/>. NULL only when <see cref="Scope"/>
    /// is <see cref="ScanMetricScope.Overall"/> — enforced by the DB CHECK
    /// constraint <c>chk_scan_metrics_scope_id_nullability</c>.
    /// </summary>
    public Guid? ScopeId { get; set; }

    public string MetricName { get; set; } = string.Empty;
    public double MetricValue { get; set; }

    /// <summary>Optional JSON blob carrying per-metric context (e.g. denominator).</summary>
    public string? MetadataJson { get; set; }

    public DateTime CreatedAt { get; set; }

    public ScanRun ScanRun { get; set; } = null!;
}
