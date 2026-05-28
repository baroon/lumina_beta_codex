using MediatR;

namespace AIVisibility.Application.Queries.Trackers;

/// <summary>
/// Consolidated tracker dashboard read model (Phase 4 v2 Slice A).
/// Returns everything the new dashboard's hero + trend chart + top
/// brands table needs in a single round trip. Window-scoped to the
/// last N days (default 30).
/// Handler returns null when the tracker does not exist.
/// </summary>
public record GetTrackerDashboardQuery(Guid TrackerId, int Days) : IRequest<TrackerDashboardDto?>;

public sealed record TrackerDashboardDto(
    Guid TrackerId,
    string TrackerName,
    Guid BrandId,
    string BrandName,
    int Days,
    DateTime WindowStart,
    /// <summary>How many scans landed in the window — useful as a sanity check on the trend chart.</summary>
    int ScanCount,
    DashboardHeroDto Hero,
    /// <summary>One series per tracked entity (brand + each tracked competitor) for every metric the aggregator emits at v2.</summary>
    IReadOnlyList<EntityTrendSeriesDto> Series,
    /// <summary>Top brands table — brand + each tracked competitor ranked by visibility (mention rate over the window).</summary>
    IReadOnlyList<TopBrandRowDto> TopBrands);

/// <summary>
/// Hero metric tiles (D6). Raw counts only — no composite scores in v2.
/// </summary>
public sealed record DashboardHeroDto(
    int Queries,
    int Mentions,
    int Citations,
    /// <summary>Tracked brand's mention rate across all scans in the window, [0..1]. Null when the window has no signals.</summary>
    double? BrandMentionRate);

public sealed record EntityTrendSeriesDto(
    string EntityType,
    Guid EntityId,
    string EntityName,
    string MetricName,
    string SeriesKind,
    IReadOnlyList<EntityTrendPointDto> Points);

public sealed record EntityTrendPointDto(
    Guid ScanRunId,
    DateTime CapturedAt,
    double? Value,
    string? Category);

/// <summary>
/// One row in the Top Brands table (D8). Sorted in the handler — tracked
/// brand always first, then competitors by Visibility desc.
/// </summary>
public sealed record TopBrandRowDto(
    string EntityType,
    Guid EntityId,
    string Name,
    bool IsTrackedBrand,
    /// <summary>Visibility = mention rate for the most-recent scan in window. Null when no scans in window.</summary>
    double? Visibility,
    /// <summary>Visibility delta vs the second-most-recent scan in window. Null when fewer than 2 scans.</summary>
    double? VisibilityDelta,
    /// <summary>Share of voice for the most-recent scan. Brand uses BrandShareOfVoice; competitors use MentionCount / total mentions.</summary>
    double? ShareOfVoice,
    double? ShareOfVoiceDelta,
    /// <summary>Sentiment for the most-recent scan (brand only — categorical mode). Null for competitors (no sentiment trend).</summary>
    string? Sentiment);
