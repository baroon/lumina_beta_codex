using MediatR;

namespace AIVisibility.Application.Queries.Prompts;

/// <summary>
/// Workspace-scoped prompt rollup for the /prompts page. Aggregates the
/// active prompt set across every tracker in the workspace, with
/// scan-count + last-scan + platform-coverage AND analytical columns
/// (visibility rate, brand mention count, dominant sentiment, average
/// position) per prompt for the window. The analytical columns join
/// through PromptRuns → AIAnswers → Mentions; each prompt's brand
/// context is the brand owning its parent tracker.
/// </summary>
public record GetWorkspacePromptsQuery(
    DateTime? From,
    DateTime? To,
    IReadOnlyList<Guid>? TrackerIds = null) : IRequest<WorkspacePromptsDto>;

public sealed record WorkspacePromptsDto(
    Guid WorkspaceId,
    /// <summary>Effective window lower bound. Null = "all time".</summary>
    DateTime? From,
    /// <summary>Effective window upper bound (resolves to UTC now when unspecified).</summary>
    DateTime To,
    IReadOnlyList<WorkspacePromptRowDto> Prompts);

public sealed record WorkspacePromptRowDto(
    Guid PromptId,
    string Text,
    Guid LensId,
    string LensName,
    /// <summary>All topic names attached via PromptTopics (case-sensitive list).</summary>
    IReadOnlyList<string> Topics,
    Guid TrackerId,
    string TrackerName,
    Guid BrandId,
    string BrandName,
    /// <summary>Distinct ScanRuns in the window where this prompt was executed.</summary>
    int ScanCount,
    /// <summary>Most recent ScanRun.CompletedAt for this prompt in window. Null when no scans.</summary>
    DateTime? LastScanAt,
    /// <summary>Distinct platform codes (e.g. "openai", "perplexity") this prompt ran on.</summary>
    IReadOnlyList<string> PlatformCodes,
    /// <summary>
    /// Fraction of in-window AIAnswers to this prompt that contained at
    /// least one mention of the prompt's tracked brand, [0..1]. Null when
    /// the prompt has no answers in window (so the FE can render "—"
    /// rather than 0%).
    /// </summary>
    double? VisibilityRate,
    /// <summary>
    /// Total tracked-brand mentions across all in-window answers to this
    /// prompt (sums Mention.MentionCount). Always ≥ 0.
    /// </summary>
    int BrandMentionCount,
    /// <summary>
    /// Dominant Sentiment value across tracked-brand mentions for this
    /// prompt (Positive / Neutral / Mixed / Negative / Unknown — the mode,
    /// ties broken by enum ordinal). Null when no brand mentions exist.
    /// </summary>
    string? DominantSentiment,
    /// <summary>
    /// Average <see cref="AIVisibility.Domain.Entities.Mention.FirstMentionPosition"/>
    /// across tracked-brand mentions for this prompt, [0..1]. Lower = more
    /// prominent (appears earlier in the answer). Null when no mentions.
    /// </summary>
    double? AverageFirstMentionPosition);
