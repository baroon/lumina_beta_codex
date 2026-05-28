using MediatR;

namespace AIVisibility.Application.Queries.Trackers;

/// <summary>
/// Tracker dashboard v2 — Slice B competitive intelligence read model.
/// Returns sources/domains/SoV/mention distribution/competitive gap/
/// recommendation rate aggregations scoped to the tracker + window.
/// Handler returns null when the tracker does not exist.
/// </summary>
public record GetTrackerCompetitiveQuery(Guid TrackerId, int Days)
    : IRequest<TrackerCompetitiveDto?>;

public sealed record TrackerCompetitiveDto(
    Guid TrackerId,
    Guid BrandId,
    string BrandName,
    int Days,
    DateTime WindowStart,
    /// <summary>Top cited source domains in the window, ranked by citation count desc.</summary>
    IReadOnlyList<DomainRowDto> TopDomains,
    /// <summary>Domain type breakdown (12-bucket SourceType) with percentage of total citations.</summary>
    IReadOnlyList<DomainTypeShareDto> DomainTypes,
    /// <summary>Per-entity mention distribution — Brand + each tracked competitor with count + share of total.</summary>
    IReadOnlyList<EntityMentionDto> MentionDistribution,
    /// <summary>Per-pair (brand vs competitor) gap analysis for mentions + recommendations.</summary>
    IReadOnlyList<CompetitiveGapDto> CompetitiveGaps,
    /// <summary>Per-entity recommendation rate (rec mentions / total mentions). Null when no mentions.</summary>
    IReadOnlyList<EntityRateDto> RecommendationRates);

public sealed record DomainRowDto(
    Guid SourceId,
    string SourceName,
    string? NormalizedDomain,
    /// <summary>12-bucket SourceType enum code from BrandSourceClassification.</summary>
    string SourceType,
    int CitationCount,
    /// <summary>CitationCount / total citations across all sources in window, [0..1].</summary>
    double CitationRate);

public sealed record DomainTypeShareDto(
    string SourceType,
    int CitationCount,
    /// <summary>0..1 share of total citations across all types in window.</summary>
    double Share);

public sealed record EntityMentionDto(
    /// <summary>"Brand" or "Competitor".</summary>
    string EntityType,
    Guid EntityId,
    string Name,
    bool IsTrackedBrand,
    int MentionCount,
    /// <summary>0..1 share of total brand+competitor mentions in window.</summary>
    double Share);

public sealed record CompetitiveGapDto(
    Guid CompetitorId,
    string CompetitorName,
    int BrandMentions,
    int CompetitorMentions,
    /// <summary>BrandMentions - CompetitorMentions. Positive means brand is ahead.</summary>
    int MentionsGap,
    int BrandRecommendations,
    int CompetitorRecommendations,
    int RecommendationsGap);

public sealed record EntityRateDto(
    string EntityType,
    Guid EntityId,
    string Name,
    bool IsTrackedBrand,
    int MentionCount,
    /// <summary>Recommendation mentions / mention count, [0..1]. Null when MentionCount is 0.</summary>
    double? RecommendationRate);
