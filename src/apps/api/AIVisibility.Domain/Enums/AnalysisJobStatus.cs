namespace AIVisibility.Domain.Enums;

/// <summary>
/// Lifecycle of an analysis job (Phase 3 plan §3, D10).
///
/// Queued      → row created by ScanExecutor right after Status=Completed; Hangfire extract job is enqueued.
/// Running     → set by the extract job on start; stays Running through the aggregate continuation.
/// Completed   → set by the aggregate job on success.
/// Failed      → terminal failure (any stage exhausted its Hangfire retry policy); ErrorMessage populated.
///
/// Hangfire owns per-job runtime state; this enum captures the audit-log view of the whole pipeline.
/// </summary>
public enum AnalysisJobStatus
{
    Queued,
    Running,
    Completed,
    Failed,
}
