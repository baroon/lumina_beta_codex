using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Phase 4 v3 Slice B — workspace-scoped competitive intelligence read
/// model. Returns top citation domains, domain types, mention
/// distribution, per-tracked-brand competitive gap groups, and per-entity
/// recommendation rates across every tracker in the workspace.
///
/// Per the v3 plan §D15, the competitive gap is grouped by tracked brand:
/// gap math only makes sense within a shared scan set, so each tracked
/// brand gets its own gap section vs its own tracked competitors.
/// </summary>
public record GetWorkspaceCompetitiveQuery(
    DateTime? From,
    DateTime? To,
    IReadOnlyList<string>? LensCodes,
    IReadOnlyList<string>? TopicNames,
    IReadOnlyList<string>? ProductNames,
    IReadOnlyList<string>? MarketNames,
    IReadOnlyList<string>? AudienceNames,
    /// <summary>
    /// Optional tracker-scope filter — see <see cref="GetWorkspaceOverviewQuery.TrackerIds"/>.
    /// </summary>
    IReadOnlyList<Guid>? TrackerIds = null,
    /// <summary>Optional Sentiment-enum filter — see <see cref="GetWorkspaceOverviewQuery.SentimentValues"/>.</summary>
    IReadOnlyList<string>? SentimentValues = null,
    /// <summary>Optional AI-platform filter — see <see cref="GetWorkspaceOverviewQuery.PlatformCodes"/>.</summary>
    IReadOnlyList<string>? PlatformCodes = null)
    : IRequest<WorkspaceCompetitiveDto>;

public sealed record WorkspaceCompetitiveDto(
    Guid WorkspaceId,
    /// <summary>Effective window lower bound. Null when the caller asked for "all time".</summary>
    DateTime? From,
    /// <summary>Effective window upper bound (resolves to UTC now when unspecified).</summary>
    DateTime To,
    /// <summary>Top citation domains across the workspace, ranked by citation count desc.</summary>
    IReadOnlyList<DomainRowDto> TopDomains,
    /// <summary>Domain type breakdown (12-bucket SourceType) over the workspace's top domains.</summary>
    IReadOnlyList<DomainTypeShareDto> DomainTypes,
    /// <summary>Per-entity mention counts across the workspace. Tracked brands + de-duplicated tracked competitors.</summary>
    IReadOnlyList<EntityMentionDto> MentionDistribution,
    /// <summary>One competitive-gap group per tracked brand, comparing it to its own tracked competitors.</summary>
    IReadOnlyList<BrandCompetitiveGapGroupDto> CompetitiveGaps,
    /// <summary>Per-entity recommendation rate across the workspace (rec mentions / total mentions).</summary>
    IReadOnlyList<EntityRateDto> RecommendationRates);

/// <summary>
/// Competitive gap rows scoped to one tracked brand. Each gap row
/// compares the brand's mentions/recommendations against one of its
/// tracked competitors, using only mentions from answers produced by
/// that brand's trackers.
/// </summary>
public sealed record BrandCompetitiveGapGroupDto(
    Guid TrackedBrandId,
    string TrackedBrandName,
    IReadOnlyList<CompetitiveGapDto> Gaps);
