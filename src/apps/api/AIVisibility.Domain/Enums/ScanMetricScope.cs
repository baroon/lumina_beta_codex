namespace AIVisibility.Domain.Enums;

/// <summary>
/// Dimension a <see cref="Entities.ScanMetric"/> row is grouped over.
/// Multi-scope is the reason ScanMetric is a row-per-metric table rather
/// than a wide one — per-platform / per-topic / per-lens breakdowns don't
/// fit columns.
///
/// <list type="bullet">
///   <item><c>Overall</c> — whole scan; <c>scope_id</c> MUST be null (enforced by CHECK).</item>
///   <item><c>Platform</c> — <c>scope_id</c> is <c>AIPlatform.Id</c>.</item>
///   <item><c>Topic</c> — <c>scope_id</c> is <c>Topic.Id</c>.</item>
///   <item><c>Lens</c> — <c>scope_id</c> is <c>Lens.Id</c>.</item>
///   <item><c>Competitor</c> — <c>scope_id</c> is the tracked <c>Competitor.Id</c>.</item>
/// </list>
/// </summary>
public enum ScanMetricScope
{
    Overall,
    Platform,
    Topic,
    Lens,
    Competitor,
}
