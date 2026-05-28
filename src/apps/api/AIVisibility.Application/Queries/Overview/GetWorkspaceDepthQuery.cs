using AIVisibility.Application.Queries.Trackers;
using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Phase 4 v3 Slice C — workspace-scoped depth read model. Returns
/// per-platform brand metrics, brand sentiment distribution, activity
/// heatmap (platform × scan-day cells, hard-capped at 90 days per v3
/// plan §D32), topic coverage heatmap (top-12 topics × platforms with
/// topics grouped by name across brands per §D17), and the last N
/// AIAnswers across the workspace (interleaved newest-first, with
/// tracker + brand context per §D18).
/// </summary>
public record GetWorkspaceDepthQuery(int Days) : IRequest<WorkspaceDepthDto>;

public sealed record WorkspaceDepthDto(
    Guid WorkspaceId,
    int Days,
    DateTime WindowStart,
    IReadOnlyList<PlatformMentionDto> MentionsByPlatform,
    IReadOnlyList<SentimentSliceDto> SentimentDistribution,
    HeatmapDto ActivityHeatmap,
    HeatmapDto TopicHeatmap,
    IReadOnlyList<WorkspaceRecentChatDto> RecentChats);

/// <summary>
/// Workspace-scoped recent-chat row. Adds tracker + brand identity to
/// the per-tracker shape so the multi-tracker UI can label each card
/// with which surface produced it.
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
    Guid TrackerId,
    string TrackerName,
    Guid BrandId,
    string BrandName);
