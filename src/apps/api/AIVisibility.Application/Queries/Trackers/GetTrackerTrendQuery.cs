using MediatR;

namespace AIVisibility.Application.Queries.Trackers;

/// <summary>
/// Tracker dashboard trend query (Phase 4 Slice 6). Returns the pre-computed
/// trend points for a tracker within a sliding window — one series per
/// dashboard metric (BrandMentionRate, BrandRecommendationRate, BrandShareOfVoice,
/// AverageBrandRank, OwnedCitationShare, OverallSentiment). Numeric metrics
/// emit one series of <see cref="TrendPointDto"/> values; sentiment emits a
/// categorical series with the same point shape (null numeric, set categorical).
/// Handler returns null when the tracker does not exist.
/// </summary>
public record GetTrackerTrendQuery(Guid TrackerId, int Days) : IRequest<TrackerTrendDto?>;

public sealed record TrackerTrendDto(
    Guid TrackerId,
    int Days,
    /// <summary>Start of the rolling window. Points with <c>CapturedAt &lt; WindowStart</c> are excluded.</summary>
    DateTime WindowStart,
    IReadOnlyList<TrendSeriesDto> Series);

public sealed record TrendSeriesDto(
    string MetricName,
    /// <summary>"Numeric" or "Categorical" — drives chart shape selection on the frontend.</summary>
    string SeriesKind,
    IReadOnlyList<TrendPointDto> Points);

public sealed record TrendPointDto(
    Guid ScanRunId,
    DateTime CapturedAt,
    /// <summary>Numeric value for rate/count/avg metrics; null for categorical and for skipped-by-aggregator metrics.</summary>
    double? Value,
    /// <summary>Categorical value (e.g. sentiment mode); null for numeric metrics.</summary>
    string? Category);
