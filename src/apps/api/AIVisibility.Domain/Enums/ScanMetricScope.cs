namespace AIVisibility.Domain.Enums;

/// <summary>
/// Dimension a <see cref="Entities.ScanMetric"/> row is grouped over
/// (Phase 3 plan §3, D15). Multi-scope is the reason ScanMetric is a row-per-
/// metric table rather than a wide one — per-platform / per-topic / per-lens
/// breakdowns don't fit columns.
///
/// <list type="bullet">
///   <item><c>Overall</c> — whole scan; <c>scope_id</c> MUST be null (enforced by CHECK).</item>
///   <item><c>Platform</c> — <c>scope_id</c> is <c>AIPlatform.Id</c>.</item>
///   <item><c>Topic</c> — <c>scope_id</c> is <c>Topic.Id</c>.</item>
///   <item><c>Lens</c> — <c>scope_id</c> is <c>Lens.Id</c>.</item>
///   <item><c>Competitor</c> — <c>scope_id</c> is the tracked <c>Competitor.Id</c>.</item>
///   <item><c>SourceType</c> — reserved for Phase 4 Slice 0 once the SourceClassification
///       reference table exists to give <c>scope_id</c> a real uuid target. Slice 2/(c)
///       does not emit rows at this scope; the value is here so callers can read it.</item>
/// </list>
/// </summary>
public enum ScanMetricScope
{
    Overall,
    Platform,
    Topic,
    Lens,
    Competitor,
    SourceType,
}
