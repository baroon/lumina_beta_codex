using MediatR;

namespace AIVisibility.Application.Queries.Prompts;

/// <summary>
/// Workspace-scoped prompt inventory for the /prompts page. Aggregates
/// the active prompt set across every tracker in the workspace, with
/// scan-count + last-scan + platform-coverage per prompt for the window.
///
/// Analytical columns (visibility, sentiment, position, mention count)
/// are deliberately omitted from v1 — they require heavier joins through
/// PromptRuns → AIAnswers → Mentions/AnswerSignals and land in a
/// follow-up. Today's table is an "inventory + activity" view.
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
    IReadOnlyList<string> PlatformCodes);
