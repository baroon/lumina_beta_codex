using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Workspace-scoped depth read model — per-platform brand metrics,
/// sentiment distribution, topic-coverage heatmap (topics × platforms
/// with topics grouped by name across brands), and the last N AIAnswers
/// across the workspace (interleaved newest-first).
/// </summary>
public record GetWorkspaceDepthQuery(
    DateTime? From,
    DateTime? To,
    IReadOnlyList<string>? LensCodes,
    IReadOnlyList<string>? TopicNames) : IRequest<WorkspaceDepthDto>;

public sealed record WorkspaceDepthDto(
    Guid WorkspaceId,
    /// <summary>Effective window lower bound. Null when the caller asked for "all time".</summary>
    DateTime? From,
    /// <summary>Effective window upper bound (resolves to UTC now when unspecified).</summary>
    DateTime To,
    IReadOnlyList<PlatformMentionDto> MentionsByPlatform,
    IReadOnlyList<SentimentSliceDto> SentimentDistribution,
    /// <summary>
    /// Topic × platform heatmap. Each cell carries both answer count
    /// and citation count so the FE can toggle which metric to render
    /// without a refetch. Row ranking is by total AnswerCount desc
    /// (capped at 12 topics).
    /// </summary>
    TopicHeatmapDto TopicHeatmap,
    IReadOnlyList<WorkspaceRecentChatDto> RecentChats);

public sealed record TopicHeatmapDto(
    IReadOnlyList<string> Rows,
    IReadOnlyList<string> Columns,
    IReadOnlyList<TopicHeatmapCellDto> Cells);

public sealed record TopicHeatmapCellDto(
    /// <summary>Topic name.</summary>
    string Row,
    /// <summary>Platform name.</summary>
    string Column,
    /// <summary>Number of answers whose prompt was tagged with this topic on this platform.</summary>
    int AnswerCount,
    /// <summary>Total citation count across those answers.</summary>
    int CitationCount);

/// <summary>
/// Workspace-scoped recent-chat row. Brand name is carried for the
/// in-list chip so the multi-tracker UI can label each card with the
/// owning brand. Tracker identity is intentionally omitted — surfacing
/// a tracker name (or id) below brand + platform + lens added clutter
/// without insight.
/// </summary>
public sealed record WorkspaceRecentChatDto(
    Guid AnswerId,
    Guid PromptRunId,
    string PromptText,
    Guid PlatformId,
    string PlatformCode,
    string PlatformName,
    string LensCode,
    string LensName,
    string AnswerSnippet,
    DateTime CapturedAt,
    int MentionCount,
    int CitationCount,
    string? BrandSentiment,
    string BrandName);
