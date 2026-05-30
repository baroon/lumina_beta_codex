using MediatR;

namespace AIVisibility.Application.Queries.Scans;

/// <summary>
/// Latest scan run for a tracker, with live progress counts (per-platform
/// breakdown + live aggregate counters). Drives the post-onboarding
/// `ScanProgressScreen` polling — every 2s the screen refreshes with
/// updated platform statuses and running totals for mentions / citations /
/// recommendations / sentiment.
/// </summary>
public record GetLatestScanQuery(Guid TrackerId) : IRequest<ScanStatusDto?>;

public record ScanStatusDto(
    Guid ScanRunId,
    string Status,
    string TriggerType,
    int ScanCheckCount,
    int CompletedCount,
    int FailedCount,
    DateTime StartedAt,
    DateTime? CompletedAt,
    /// <summary>Tracked brand name — drives the scan-progress title ('Checking ... for {brand}…').</summary>
    string BrandName,
    IReadOnlyList<ScanPlatformProgressDto> Platforms,
    LiveCountersDto LiveCounters);

/// <summary>
/// Per-platform slice of a scan's prompt-run progress. `Status` is derived
/// from the row counts so the FE can render a single badge without
/// reimplementing the rule: Pending = nothing started, Running = some
/// completed/failed but more pending, Done = all completed (possibly with
/// a mix of failures).
/// </summary>
public record ScanPlatformProgressDto(
    Guid PlatformId,
    string Code,
    string Name,
    int Completed,
    int Failed,
    int Total,
    string Status);

/// <summary>
/// Live aggregate counters joined to the active scan via
/// PromptRun &rarr; AIAnswer &rarr; (Mention | Citation). Sentiment is
/// returned as a per-category histogram; the FE computes
/// `positive - negative` for the net-delta tile.
/// </summary>
public record LiveCountersDto(
    int Mentions,
    int Citations,
    int Recommended,
    SentimentDistributionDto Sentiment);

public record SentimentDistributionDto(
    int Positive,
    int Neutral,
    int Negative,
    int Mixed,
    int Unknown);
