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
    IReadOnlyList<WorkspacePromptRowDto> Prompts,
    /// <summary>
    /// Sum of <see cref="AIVisibility.Domain.Entities.TrackerConfiguration.PromptAllocation"/>
    /// across every in-scope tracker. Drives the workspace-wide
    /// "X / Y prompts" quota indicator on /prompts.
    /// </summary>
    int TotalAllocation,
    /// <summary>
    /// Total Active prompts across every in-scope tracker. Equals
    /// <c>Prompts.Count</c> — surfaced as its own field so the FE doesn't
    /// have to reproduce the aggregation client-side.
    /// </summary>
    int TotalUsed,
    /// <summary>
    /// In-scope trackers with allocation + per-tracker lens options. Used
    /// by the /prompts Add-prompt dialog to populate the tracker picker
    /// (and, after the user selects one, the lens picker) without an
    /// extra round-trip to the per-tracker list endpoint.
    /// </summary>
    IReadOnlyList<WorkspacePromptTrackerOptionDto> Trackers);

/// <summary>
/// One in-scope tracker on the workspace /prompts page. Carries enough
/// metadata (allocation, used, lens options) for the Add-prompt dialog
/// to drive both the tracker picker and the dependent lens picker.
/// </summary>
public sealed record WorkspacePromptTrackerOptionDto(
    Guid Id,
    string Name,
    Guid BrandId,
    string BrandName,
    int PromptAllocation,
    int PromptUsed,
    IReadOnlyList<WorkspacePromptLensOptionDto> Lenses);

public sealed record WorkspacePromptLensOptionDto(Guid Id, string Name);

public sealed record WorkspacePromptRowDto(
    Guid PromptId,
    string Text,
    Guid LensId,
    string LensName,
    /// <summary>All topic names attached via PromptTopics (case-sensitive list).</summary>
    IReadOnlyList<string> Topics,
    /// <summary>All product names attached via PromptProducts. Same shape as Topics.</summary>
    IReadOnlyList<string> Products,
    /// <summary>All audience names attached via PromptAudiences. Same shape as Topics.</summary>
    IReadOnlyList<string> Audiences,
    /// <summary>All market names attached via PromptMarkets. Same shape as Topics.</summary>
    IReadOnlyList<string> Markets,
    /// <summary>
    /// Distinct ISO-3166 country codes derived from the attached markets'
    /// <see cref="AIVisibility.Domain.Entities.Market.CountryCode"/>. Empty
    /// when no market is attached or none of them carry a country code.
    /// Drives the "Country" column on /prompts.
    /// </summary>
    IReadOnlyList<string> MarketCountryCodes,
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
