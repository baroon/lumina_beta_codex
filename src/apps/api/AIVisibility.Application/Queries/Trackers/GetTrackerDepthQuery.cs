using MediatR;

namespace AIVisibility.Application.Queries.Trackers;

/// <summary>
/// Tracker dashboard v2 — Slice C platform / topic / activity depth +
/// recent chats read model. Returns per-platform brand metrics, overall
/// sentiment distribution, two heatmaps (activity = platform × scan,
/// topic = topic × platform), and the last N AIAnswers projection for
/// the recent-chats panel. Handler returns null when the tracker does
/// not exist.
/// </summary>
public record GetTrackerDepthQuery(Guid TrackerId, int Days)
    : IRequest<TrackerDepthDto?>;

public sealed record TrackerDepthDto(
    Guid TrackerId,
    Guid BrandId,
    string BrandName,
    int Days,
    DateTime WindowStart,
    /// <summary>Per-platform answer count + brand mention rate in window.</summary>
    IReadOnlyList<PlatformMentionDto> MentionsByPlatform,
    /// <summary>Brand sentiment distribution across all brand mentions in window.</summary>
    IReadOnlyList<SentimentSliceDto> SentimentDistribution,
    /// <summary>Platform (rows) × scan (cols) heatmap of brand mention counts.</summary>
    HeatmapDto ActivityHeatmap,
    /// <summary>Topic (rows) × platform (cols) heatmap of answer counts.</summary>
    HeatmapDto TopicHeatmap,
    /// <summary>Last N AIAnswers in window, newest first.</summary>
    IReadOnlyList<RecentChatDto> RecentChats);

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
/// with sparse cell values. FE wrapper densifies to nivo's nested shape.
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

public sealed record RecentChatDto(
    Guid AnswerId,
    Guid PromptRunId,
    string PromptText,
    Guid PlatformId,
    string PlatformCode,
    string PlatformName,
    string LensCode,
    string LensName,
    /// <summary>First 200 chars of the answer body (no markdown stripping for v2).</summary>
    string AnswerSnippet,
    DateTime CapturedAt,
    int MentionCount,
    int CitationCount,
    /// <summary>Brand sentiment for this answer ("Positive"/"Negative"/etc.); null when no AnswerSignal.</summary>
    string? BrandSentiment);
