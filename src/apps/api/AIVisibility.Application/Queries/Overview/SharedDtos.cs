namespace AIVisibility.Application.Queries.Overview;

// Shared DTO records used by the workspace overview read endpoints.
// Each record represents a row shape returned by one of the three
// /api/overview endpoints (overview / competitive / depth) — kept here
// in one file because the shapes are reused across all three.

// -----------------------------------------------------------------
// Trend series (overview endpoint)
// -----------------------------------------------------------------

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

// -----------------------------------------------------------------
// Competitive intelligence row shapes (competitive endpoint)
// -----------------------------------------------------------------

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

// -----------------------------------------------------------------
// Depth row shapes (depth endpoint)
// -----------------------------------------------------------------

public sealed record PlatformMentionDto(
    Guid PlatformId,
    string PlatformCode,
    string PlatformName,
    int AnswerCount,
    int BrandMentionCount,
    /// <summary>BrandMentionCount / AnswerCount [0..1]. Null when no answers.</summary>
    double? BrandMentionRate);

public sealed record SentimentSliceDto(
    /// <summary>Sentiment enum name ("Positive" | "Neutral" | "Negative" | "Mixed" | "Unknown").</summary>
    string Sentiment,
    int Count,
    /// <summary>0..1 share of all brand mentions in window.</summary>
    double Share);

/// <summary>
/// Generic heatmap payload: row labels (Y axis) × column labels (X axis)
/// with sparse cell values. FE wrapper densifies to its grid shape.
/// </summary>
public sealed record HeatmapDto(
    IReadOnlyList<string> Rows,
    IReadOnlyList<string> Columns,
    IReadOnlyList<HeatmapCellDto> Cells);

public sealed record HeatmapCellDto(
    /// <summary>Row label this cell belongs to.</summary>
    string Row,
    /// <summary>Column label this cell belongs to.</summary>
    string Column,
    int Value);
