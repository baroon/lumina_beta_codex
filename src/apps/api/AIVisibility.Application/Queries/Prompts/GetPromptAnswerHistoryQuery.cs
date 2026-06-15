using MediatR;

namespace AIVisibility.Application.Queries.Prompts;

/// <summary>
/// Per-prompt answer history at /api/prompts/{promptId}/answers — the
/// data behind the row-click drawer on /prompts. Returns one row per
/// AIAnswer for the prompt across in-window scans, with the prompt's
/// tracker-brand mention rolled up onto each row (mention count,
/// dominant sentiment, first-mention position, evidence snippet).
///
/// Workspace-scoped: the handler verifies the prompt belongs to a
/// tracker owned by a brand in the current workspace and returns an
/// empty result otherwise (no 404 — same shape as the rest of the
/// reports queries so the FE renders a clean empty state).
/// </summary>
public record GetPromptAnswerHistoryQuery(
    Guid PromptId,
    DateTime? From,
    DateTime? To) : IRequest<PromptAnswerHistoryDto>;

public sealed record PromptAnswerHistoryDto(
    Guid PromptId,
    /// <summary>Prompt text at the time of the query. Empty when the prompt is out of scope.</summary>
    string PromptText,
    /// <summary>Effective window lower bound. Null = "all time".</summary>
    DateTime? From,
    /// <summary>Effective window upper bound (resolves to UTC now when unspecified).</summary>
    DateTime To,
    IReadOnlyList<PromptAnswerRowDto> Answers);

/// <summary>
/// One row per AIAnswer for the queried prompt. Brand-mention fields
/// roll up the prompt's tracker-brand Mentions only — cross-brand
/// mentions in the same answer (e.g. competitors) are filtered out.
/// </summary>
public sealed record PromptAnswerRowDto(
    Guid AnswerId,
    Guid ScanRunId,
    /// <summary>ScanRun.CompletedAt (or StartedAt when null). Drives the answer-card date.</summary>
    DateTime ScannedAt,
    string PlatformCode,
    string PlatformName,
    /// <summary>Full AIAnswer.AnswerText. May be empty when the provider returned no body.</summary>
    string AnswerText,
    /// <summary>Total tracked-brand mentions on this answer. 0 = brand not mentioned.</summary>
    int BrandMentionCount,
    /// <summary>Dominant Sentiment across this answer's brand mentions (mode, ordinal tie-break). Null when not mentioned.</summary>
    string? DominantSentiment,
    /// <summary>Min <see cref="AIVisibility.Domain.Entities.Mention.FirstMentionPosition"/> across brand mentions on this answer. Null when not mentioned.</summary>
    double? FirstMentionPosition,
    /// <summary>First non-empty <see cref="AIVisibility.Domain.Entities.Mention.EvidenceSnippet"/> across brand mentions. Null when not mentioned.</summary>
    string? EvidenceSnippet);
