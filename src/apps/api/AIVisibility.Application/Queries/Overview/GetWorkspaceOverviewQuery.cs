using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Phase 4 v3 Slice A — workspace-scoped overview read model. Aggregates
/// hero counts, per-entity trend series, and the Top Brands table across
/// every TrackerConfiguration owned by the current workspace's Brands.
///
/// Window-scoped to the last N days (default 30; capped at 365). Always
/// returns a non-null payload — an empty workspace produces zeros.
/// </summary>
public record GetWorkspaceOverviewQuery(int Days) : IRequest<WorkspaceOverviewDto>;

public sealed record WorkspaceOverviewDto(
    Guid WorkspaceId,
    int Days,
    DateTime WindowStart,
    /// <summary>Tracked brand snapshot — id + name for each Brand in the workspace.</summary>
    IReadOnlyList<TrackedBrandDto> TrackedBrands,
    /// <summary>Distinct competitors across every tracker in the workspace, de-duplicated by Competitor.Id.</summary>
    IReadOnlyList<WorkspaceCompetitorDto> Competitors,
    /// <summary>How many scans landed in the window — sanity check on the trend chart.</summary>
    int ScanCount,
    WorkspaceHeroDto Hero,
    /// <summary>One series per (entity, metric) across the entire workspace, ordered chronologically.</summary>
    IReadOnlyList<EntityTrendSeriesDto> Series,
    /// <summary>Top entities table — every tracked brand first, then competitors by visibility desc.</summary>
    IReadOnlyList<WorkspaceTopEntityRowDto> TopEntities);

public sealed record TrackedBrandDto(Guid BrandId, string Name);

public sealed record WorkspaceCompetitorDto(Guid CompetitorId, string Name);

public sealed record WorkspaceHeroDto(
    int Queries,
    int Mentions,
    int Citations,
    /// <summary>
    /// Brand mention rate across the workspace, [0..1]. Computed as
    /// (answers with ≥1 tracked-brand mention) / (total answers). Null
    /// when no answers landed in the window.
    /// </summary>
    double? BrandMentionRate);

/// <summary>
/// One row in the overview Top Entities table. Same shape as v2's
/// TopBrandRowDto plus we always know which brand a competitor belongs
/// to in a multi-brand workspace (returned as part of the row).
/// </summary>
public sealed record WorkspaceTopEntityRowDto(
    string EntityType,
    Guid EntityId,
    string Name,
    bool IsTrackedBrand,
    /// <summary>Visibility = latest mention rate in window. Null when no trend rows.</summary>
    double? Visibility,
    /// <summary>Visibility delta vs the second-most-recent point. Null when fewer than 2 points.</summary>
    double? VisibilityDelta,
    /// <summary>Share of voice for the most-recent scan (brand-only).</summary>
    double? ShareOfVoice,
    double? ShareOfVoiceDelta,
    /// <summary>Sentiment for the most-recent scan (brand-only categorical mode).</summary>
    string? Sentiment);
