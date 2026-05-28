using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetTrackerTrendQueryHandler : IRequestHandler<GetTrackerTrendQuery, TrackerTrendDto?>
{
    // Default to 30d when the caller passes a non-positive value — guards against
    // ?days=0 yielding an empty window via the route binding default.
    private const int DefaultDays = 30;
    private const int MaxDays = 365;

    private static readonly HashSet<string> CategoricalMetrics = new(StringComparer.Ordinal)
    {
        "OverallSentiment",
    };

    private readonly IAppDbContext _db;

    public GetTrackerTrendQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<TrackerTrendDto?> Handle(GetTrackerTrendQuery request, CancellationToken cancellationToken)
    {
        var trackerExists = await _db.TrackerConfigurations.AsNoTracking()
            .AnyAsync(t => t.Id == request.TrackerId, cancellationToken);
        if (!trackerExists) return null;

        var days = request.Days <= 0 ? DefaultDays : Math.Min(request.Days, MaxDays);
        var windowStart = DateTime.UtcNow.AddDays(-days);

        // Phase 4 v2 transition: TrendPoint now stores per-entity rows; this
        // v1 endpoint maintains its brand-only contract by filtering to
        // EntityType=Brand. The dashboard v2 endpoint (GetTrackerDashboardQuery)
        // is the new home for multi-entity series; this endpoint is deprecated
        // and will be removed when the v2 frontend lands.
        var points = await _db.TrendPoints.AsNoTracking()
            .Where(p => p.TrackerConfigurationId == request.TrackerId
                && p.CapturedAt >= windowStart
                && p.EntityType == TrendEntityType.Brand)
            .OrderBy(p => p.CapturedAt)
            .ToListAsync(cancellationToken);

        var series = points
            .GroupBy(p => p.MetricName, StringComparer.Ordinal)
            .Select(g => new TrendSeriesDto(
                MetricName: g.Key,
                SeriesKind: CategoricalMetrics.Contains(g.Key) ? "Categorical" : "Numeric",
                Points: g
                    .Select(p => new TrendPointDto(
                        ScanRunId: p.ScanRunId,
                        CapturedAt: p.CapturedAt,
                        Value: p.NumericValue,
                        Category: p.CategoricalValue))
                    .ToList()))
            .OrderBy(s => s.MetricName, StringComparer.Ordinal)
            .ToList();

        return new TrackerTrendDto(
            TrackerId: request.TrackerId,
            Days: days,
            WindowStart: windowStart,
            Series: series);
    }
}
