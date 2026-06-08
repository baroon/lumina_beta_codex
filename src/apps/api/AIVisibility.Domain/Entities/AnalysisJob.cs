using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// Audit-log record for one scan's analysis pipeline run (Phase 3 plan §3, D2/D10).
/// 1:1 with ScanRun (no reprocessing in v1 — D4). Hangfire is the runtime engine that
/// schedules and retries the per-phase jobs; this entity captures the consolidated
/// outcome so reporting queries don't need to join Hangfire's internal tables.
/// </summary>
public class AnalysisJob
{
    public Guid Id { get; set; }
    public Guid ScanRunId { get; set; }

    public AnalysisJobStatus Status { get; set; }

    /// <summary>Set when the extract Hangfire job starts.</summary>
    public DateTime? ExtractStartedAt { get; set; }
    /// <summary>Set when the extract Hangfire job finishes successfully.</summary>
    public DateTime? ExtractCompletedAt { get; set; }
    /// <summary>Set when the aggregate Hangfire job starts (after extract continuation).</summary>
    public DateTime? AggregateStartedAt { get; set; }
    /// <summary>Set when the aggregate Hangfire job finishes successfully.</summary>
    public DateTime? AggregateCompletedAt { get; set; }

    /// <summary>
    /// Hangfire retry count for the aggregate stage. 0 = first attempt succeeded
    /// or failed on first try with no retry budget. Incremented at the start of
    /// each <c>MetricAggregationJob.AggregateAsync</c> call when
    /// <see cref="AggregateStartedAt"/> is already populated from a prior attempt.
    /// Capped by the <c>[AutomaticRetry(Attempts = N)]</c> policy on
    /// <c>IMetricAggregationJob</c>; once exhausted, Status flips to Failed.
    /// </summary>
    public int AggregateRetryCount { get; set; }

    /// <summary>Stage class name + thrown exception message; populated when Status=Failed.</summary>
    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; }

    public ScanRun ScanRun { get; set; } = null!;
}
