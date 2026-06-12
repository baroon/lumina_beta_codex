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
    IReadOnlyList<string>? TopicNames,
    IReadOnlyList<string>? ProductNames,
    IReadOnlyList<string>? MarketNames,
    IReadOnlyList<string>? AudienceNames,
    /// <summary>
    /// Optional tracker-scope filter — when null or empty, all trackers in
    /// the workspace's brands are used (matches the convention of the
    /// other filter params). When non-empty, only trackers in this set
    /// (intersected with workspace membership for safety) are included.
    /// Drives the FE TrackerSelector's `?trackers=` URL param.
    /// </summary>
    IReadOnlyList<Guid>? TrackerIds = null) : IRequest<WorkspaceOverviewDto>;

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
    IReadOnlyList<WorkspaceTopEntityRowDto> TopEntities,
    /// <summary>
    /// Top-N attributes the AI ascribed to any tracked brand across the
    /// window (Phase 4 measurement-model expansion, item #10). Aggregated
    /// from <c>MentionAttribute</c> rows joined to brand-typed Mentions —
    /// from-source rather than re-summing per-scan <c>BrandTopAttribute</c>
    /// metric rows so attributes consistently in the #11+ slot of any one
    /// scan still surface when they accumulate broadly. Polarity at the
    /// workspace grain = mode polarity across the attribute's mentions.
    /// Empty when no attributes were extracted in scope.
    /// </summary>
    IReadOnlyList<WorkspaceBrandAttributeDto> TopBrandAttributes,
    /// <summary>
    /// Per-competitor co-mention rollup across the window (Phase 4
    /// measurement-model expansion, item #8 — competitive landscape).
    /// Each row is a tracked competitor and the count of in-scope
    /// answers where BOTH a tracked brand AND this competitor were
    /// mentioned. The FE divides <c>CoMentionCount</c> by
    /// <c>CompetitorMentionCount</c> to get "what % of the
    /// competitor's mentions share the conversation with us." Rows
    /// with zero competitor mentions are omitted.
    /// </summary>
    IReadOnlyList<WorkspaceCoMentionDto> CoMentions,
    /// <summary>
    /// Top-N risk flags the AI attached to any tracked brand across the
    /// window (Phase 4 measurement-model expansion, item #11).
    /// Aggregated from <c>MentionRiskFlag</c> rows joined to brand-typed
    /// Mentions. Severity at the workspace grain = mode severity across
    /// the flag type's mentions. Ordered by count desc, then by
    /// alphabetical flag type. 10-row cap. Empty when no risk flags
    /// were extracted in scope.
    /// </summary>
    IReadOnlyList<WorkspaceBrandRiskFlagDto> TopBrandRiskFlags,
    /// <summary>
    /// Top-N head-to-head comparison aspects the AI judged for any
    /// tracked brand (Phase 4 measurement-model expansion, item #15).
    /// Each row carries the aspect (price, support_quality, etc.) plus
    /// the win and loss counts at the workspace grain — wins where the
    /// brand was named winner, losses where it lost to the vs entity.
    /// Ties / unclear judgments are skipped at extraction so they
    /// don't show up here. Ordered by total comparisons desc (most
    /// contested aspects first), then alphabetical aspect for
    /// determinism. 10-row cap. Empty when no comparisons were
    /// extracted in scope.
    /// </summary>
    IReadOnlyList<WorkspaceBrandComparisonDto> TopBrandComparisons,
    /// <summary>
    /// Per-topic ownership rollup across the window (Phase 4
    /// measurement-model expansion, item #18). For each topic the
    /// workspace's prompts touch, the row carries the number of
    /// prompts tagged with it and the subset where ≥1 answer
    /// mentioned a tracked brand. The FE divides them to surface the
    /// "You own X (8/10 prompts), you lose Y (1/10)" insight that no
    /// scan-grain metric carries on its own. Sorted by total prompt
    /// count desc, then alphabetical topic for determinism. 10-row
    /// cap. Empty when no topics are tagged on any in-scope prompt.
    /// </summary>
    IReadOnlyList<WorkspaceTopicOwnershipDto> TopicOwnership);

/// <summary>
/// One attribute the AI ascribed to a tracked brand across the workspace.
/// Mirrors the per-scan <c>BrandAttributeDto</c> shape but is named
/// distinctly so the FE can keep its types ergonomic (the per-scan and
/// per-workspace fields end up in different DTO trees).
/// </summary>
public sealed record WorkspaceBrandAttributeDto(
    int Rank,
    string Name,
    /// <summary>"Positive" / "Negative" / "Neutral" — mode across the attribute's mentions.</summary>
    string Polarity,
    /// <summary>Distinct mentions tagged with this attribute in scope.</summary>
    int MentionCount);

/// <summary>
/// One row in the workspace co-mention rollup. Powers the "competitive
/// landscape" chart: when our tracked brands are mentioned, which
/// competitors share the conversation, and at what rate relative to
/// each competitor's own visibility.
/// </summary>
public sealed record WorkspaceCoMentionDto(
    Guid CompetitorId,
    string CompetitorName,
    /// <summary>Distinct in-scope answers where BOTH a tracked brand AND this competitor appeared.</summary>
    int CoMentionCount,
    /// <summary>Distinct in-scope answers where this competitor was mentioned (regardless of any brand mention).</summary>
    int CompetitorMentionCount);

/// <summary>
/// One risk flag attached to a tracked brand across the workspace —
/// type, mode severity, and how many mentions carry it. Captures the
/// "did the AI surface concerns about us?" signal independent of the
/// sentiment enum (a Positive-sentiment mention can still carry a
/// risk flag like "recent layoffs" or "outage history").
/// </summary>
public sealed record WorkspaceBrandRiskFlagDto(
    int Rank,
    string FlagType,
    /// <summary>"Low" / "Medium" / "High" — mode severity across the flag type's mentions.</summary>
    string Severity,
    /// <summary>Distinct mentions tagged with this risk flag type in scope.</summary>
    int MentionCount);

/// <summary>
/// One row in the workspace head-to-head comparison rollup. Carries
/// the aspect (price, speed, etc.) plus win/loss counts at the
/// workspace grain. The FE renders these as a "where we win, where
/// we lose" grid so users can see which dimensions the AI judges in
/// our favor and which it doesn't.
/// </summary>
public sealed record WorkspaceBrandComparisonDto(
    int Rank,
    /// <summary>Canonical snake_case aspect (e.g. "price", "support_quality").</summary>
    string Aspect,
    /// <summary>Comparisons in scope where the tracked brand was the winner on this aspect.</summary>
    int WinCount,
    /// <summary>Comparisons in scope where the tracked brand was the loser on this aspect.</summary>
    int LossCount);

/// <summary>
/// One row in the workspace topic-ownership rollup. Lets the FE
/// surface "You own X but lose Y" without computing it per-scan and
/// re-summing — denominator stability matters because per-scan
/// rollups can lose a topic entirely when the scan happens to have
/// no answers from prompts tagged with it.
/// </summary>
public sealed record WorkspaceTopicOwnershipDto(
    int Rank,
    /// <summary>Topic name (deduped across per-brand Topic rows by display name).</summary>
    string TopicName,
    /// <summary>Distinct in-scope prompts tagged with this topic.</summary>
    int PromptCount,
    /// <summary>Distinct in-scope prompts tagged with this topic where ≥1 answer mentioned a tracked brand.</summary>
    int BrandMentionedPromptCount);

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
    double? BrandMentionRate,
    /// <summary>
    /// Fraction of in-scope answers where every tracked brand is
    /// entirely absent — no mention AND no owned citation. Mirrors
    /// <c>MetricNames.BrandAbsenceRate</c> at the workspace grain.
    /// Range [0,1]; null when no answers landed in the window.
    /// </summary>
    double? BrandAbsenceRate,
    /// <summary>
    /// Among answers with ≥1 entity mention, the fraction where a
    /// tracked brand was the first-named entity by
    /// <c>Mention.FirstMentionPosition</c>. Mirrors
    /// <c>MetricNames.BrandFirstMentionRate</c> at the workspace
    /// grain. Range [0,1]; null when no scoped answers had any
    /// mentions.
    /// </summary>
    double? BrandFirstMentionRate);

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
