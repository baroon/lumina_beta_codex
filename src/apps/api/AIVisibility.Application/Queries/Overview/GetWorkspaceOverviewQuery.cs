using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Phase 4 v3 Slice A — workspace-scoped overview read model. Aggregates
/// hero counts, per-entity trend series, and the Top Brands table across
/// every TrackerConfiguration owned by the current workspace's Brands.
///
/// Window is a half-open <c>[From, To]</c> range. <c>From=null</c> means
/// "all time" (no lower bound); <c>To=null</c> resolves to UTC now.
/// <c>LensCodes</c> filters the answer-derived sections (hero counts);
/// when null or empty no lens filter is applied. The longitudinal trend
/// series + Top Entities table read from pre-aggregated TrendPoints
/// (no lens granularity) and stay workspace-wide on purpose.
/// Always returns a non-null payload — an empty workspace produces zeros.
/// </summary>
public record GetWorkspaceOverviewQuery(
    DateTime? From,
    DateTime? To,
    IReadOnlyList<string>? LensCodes,
    IReadOnlyList<string>? TopicNames) : IRequest<WorkspaceOverviewDto>;

public sealed record WorkspaceOverviewDto(
    Guid WorkspaceId,
    /// <summary>Effective window lower bound. Null when the caller asked for "all time".</summary>
    DateTime? From,
    /// <summary>Effective window upper bound (resolves to UTC now when unspecified).</summary>
    DateTime To,
    /// <summary>Tracked brand snapshot — id + name for each Brand in the workspace.</summary>
    IReadOnlyList<TrackedBrandDto> TrackedBrands,
    /// <summary>Distinct competitors across every tracker in the workspace, de-duplicated by Competitor.Id.</summary>
    IReadOnlyList<WorkspaceCompetitorDto> Competitors,
    /// <summary>How many scans landed in the window — sanity check on the trend chart.</summary>
    int ScanCount,
    WorkspaceHeroDto Hero,
    /// <summary>
    /// Hero counts for the equivalent window immediately before
    /// <see cref="From"/> (same length, shifted back). Null when the
    /// caller asked for "all time" (no previous window exists) or when
    /// the workspace is empty for that span. Used by the FE to render
    /// the up/down delta chip next to each hero number.
    /// </summary>
    WorkspaceHeroDto? PreviousHero,
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
    string? Sentiment,
    /// <summary>
    /// Sentiment delta vs the second-most-recent scan, encoded as the
    /// difference of numeric sentiment scores
    /// (Positive=+1, Neutral=0, Mixed=0, Negative=-1, Unknown=null).
    /// Range [-2, +2]. Null when fewer than 2 scans have sentiment data
    /// or when either side is Unknown.
    /// </summary>
    double? SentimentDelta);
