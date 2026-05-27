namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Phase 3 analysis tuning knobs (Phase 3 plan §2, D21). Bound from the
/// <c>Analysis</c> section in appsettings.
/// </summary>
public class AnalysisOptions
{
    public const string SectionName = "Analysis";

    /// <summary>
    /// Max in-flight per-answer extraction calls inside a single Hangfire
    /// extract job (D21 — bounded parallelism via SemaphoreSlim). Default 5.
    /// </summary>
    public int ExtractionConcurrency { get; set; } = 5;
}
