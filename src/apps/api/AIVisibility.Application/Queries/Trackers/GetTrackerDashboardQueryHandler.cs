using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetTrackerDashboardQueryHandler : IRequestHandler<GetTrackerDashboardQuery, TrackerDashboardDto?>
{
    private const int DefaultDays = 30;
    private const int MaxDays = 365;

    private static readonly HashSet<string> CategoricalMetrics = new(StringComparer.Ordinal)
    {
        TrendMetrics.OverallSentiment,
    };

    private readonly IAppDbContext _db;

    public GetTrackerDashboardQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<TrackerDashboardDto?> Handle(
        GetTrackerDashboardQuery request, CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => t.Id == request.TrackerId)
            .Select(t => new
            {
                t.Id,
                t.Name,
                BrandId = t.BrandId,
                BrandName = t.Brand.Name,
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (tracker == null) return null;

        var days = request.Days <= 0 ? DefaultDays : Math.Min(request.Days, MaxDays);
        var windowStart = DateTime.UtcNow.AddDays(-days);

        // Scan ids in window — used by the hero counts to scope answers/citations.
        var scanIds = await _db.ScanRuns.AsNoTracking()
            .Where(s => s.TrackerConfigurationId == request.TrackerId && s.StartedAt >= windowStart)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var hero = await BuildHeroAsync(scanIds, tracker.BrandId, cancellationToken);
        var trendPoints = await _db.TrendPoints.AsNoTracking()
            .Where(p => p.TrackerConfigurationId == request.TrackerId && p.CapturedAt >= windowStart)
            .OrderBy(p => p.CapturedAt)
            .ToListAsync(cancellationToken);

        var entityNames = await ResolveEntityNamesAsync(trendPoints, cancellationToken);
        var series = BuildSeries(trendPoints, entityNames);
        var topBrands = BuildTopBrands(trendPoints, entityNames, tracker.BrandId);

        return new TrackerDashboardDto(
            TrackerId: tracker.Id,
            TrackerName: tracker.Name,
            BrandId: tracker.BrandId,
            BrandName: tracker.BrandName,
            Days: days,
            WindowStart: windowStart,
            ScanCount: scanIds.Count,
            Hero: hero,
            Series: series,
            TopBrands: topBrands);
    }

    // -----------------------------------------------------------------
    // Hero counts (D6)
    // -----------------------------------------------------------------

    private async Task<DashboardHeroDto> BuildHeroAsync(
        IReadOnlyList<Guid> scanIds, Guid brandId, CancellationToken ct)
    {
        if (scanIds.Count == 0)
        {
            return new DashboardHeroDto(0, 0, 0, null);
        }

        var scanIdSet = scanIds.ToHashSet();

        // Queries = prompt-runs in the window (each prompt-run is one prompt × platform query).
        var queries = await _db.PromptRuns.AsNoTracking()
            .CountAsync(pr => scanIdSet.Contains(pr.ScanRunId), ct);

        var answerIds = await _db.AIAnswers.AsNoTracking()
            .Where(a => _db.PromptRuns.AsNoTracking()
                .Where(pr => scanIdSet.Contains(pr.ScanRunId))
                .Select(pr => pr.Id)
                .Contains(a.PromptRunId))
            .Select(a => a.Id)
            .ToListAsync(ct);
        var answerIdSet = answerIds.ToHashSet();

        var mentions = answerIdSet.Count == 0 ? 0 : await _db.Mentions.AsNoTracking()
            .CountAsync(m => answerIdSet.Contains(m.AIAnswerId), ct);
        var citations = answerIdSet.Count == 0 ? 0 : await _db.Citations.AsNoTracking()
            .CountAsync(c => answerIdSet.Contains(c.AIAnswerId), ct);

        // BrandMentionRate over the window — average across scans' brand
        // trend rows. Skip null/no-data scans.
        var rates = await _db.TrendPoints.AsNoTracking()
            .Where(p => scanIdSet.Contains(p.ScanRunId)
                && p.EntityType == TrendEntityType.Brand
                && p.EntityId == brandId
                && p.MetricName == MetricNames.BrandMentionRate
                && p.NumericValue != null)
            .Select(p => p.NumericValue!.Value)
            .ToListAsync(ct);
        double? brandMentionRate = rates.Count > 0 ? rates.Average() : (double?)null;

        return new DashboardHeroDto(queries, mentions, citations, brandMentionRate);
    }

    // -----------------------------------------------------------------
    // Series grouping (D7)
    // -----------------------------------------------------------------

    private static IReadOnlyList<EntityTrendSeriesDto> BuildSeries(
        IReadOnlyList<Domain.Entities.TrendPoint> points,
        IReadOnlyDictionary<(TrendEntityType, Guid), string> entityNames)
    {
        return points
            .GroupBy(p => (p.EntityType, p.EntityId, p.MetricName))
            .Select(g => new EntityTrendSeriesDto(
                EntityType: g.Key.EntityType.ToString(),
                EntityId: g.Key.EntityId,
                EntityName: entityNames.TryGetValue((g.Key.EntityType, g.Key.EntityId), out var name)
                    ? name
                    : "Unknown",
                MetricName: g.Key.MetricName,
                SeriesKind: CategoricalMetrics.Contains(g.Key.MetricName) ? "Categorical" : "Numeric",
                Points: g.OrderBy(p => p.CapturedAt)
                    .Select(p => new EntityTrendPointDto(
                        ScanRunId: p.ScanRunId,
                        CapturedAt: p.CapturedAt,
                        Value: p.NumericValue,
                        Category: p.CategoricalValue))
                    .ToList()))
            .OrderBy(s => s.MetricName, StringComparer.Ordinal)
            .ThenBy(s => s.EntityName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    // -----------------------------------------------------------------
    // Top Brands table (D8/D9)
    // -----------------------------------------------------------------

    private static IReadOnlyList<TopBrandRowDto> BuildTopBrands(
        IReadOnlyList<Domain.Entities.TrendPoint> points,
        IReadOnlyDictionary<(TrendEntityType, Guid), string> entityNames,
        Guid trackedBrandId)
    {
        // Group all trend rows by (entity, metric) — for each entity we need
        // the most-recent + second-most-recent of BrandMentionRate (used as
        // Visibility) and BrandShareOfVoice for the tracked brand, and
        // MentionRate / (MentionCount / scan's total) for competitors.
        var byEntity = points
            .GroupBy(p => (p.EntityType, p.EntityId))
            .ToList();

        var rows = new List<TopBrandRowDto>();
        foreach (var entityGroup in byEntity)
        {
            var (entityType, entityId) = entityGroup.Key;
            if (!entityNames.TryGetValue(entityGroup.Key, out var name)) continue;

            var isBrand = entityType == TrendEntityType.Brand;
            var visibilityMetric = isBrand ? MetricNames.BrandMentionRate : TrendMetrics.MentionRate;
            var sovMetric = isBrand ? MetricNames.BrandShareOfVoice : (string?)null;

            var (visibility, visibilityDelta) = LatestAndDelta(entityGroup, visibilityMetric);
            var (sov, sovDelta) = sovMetric is null
                ? (null, null)
                : LatestAndDelta(entityGroup, sovMetric);
            var sentiment = isBrand ? LatestCategorical(entityGroup, TrendMetrics.OverallSentiment) : null;

            rows.Add(new TopBrandRowDto(
                EntityType: entityType.ToString(),
                EntityId: entityId,
                Name: name,
                IsTrackedBrand: entityType == TrendEntityType.Brand && entityId == trackedBrandId,
                Visibility: visibility,
                VisibilityDelta: visibilityDelta,
                ShareOfVoice: sov,
                ShareOfVoiceDelta: sovDelta,
                Sentiment: sentiment));
        }

        // Tracked brand always first; then by Visibility desc; null visibility last.
        return rows
            .OrderByDescending(r => r.IsTrackedBrand)
            .ThenByDescending(r => r.Visibility ?? double.NegativeInfinity)
            .ThenBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <summary>
    /// Returns (latest, latest - previous) for a metric within an entity's
    /// trend rows. Null when no points; delta null when only one point.
    /// </summary>
    private static (double? Latest, double? Delta) LatestAndDelta(
        IEnumerable<Domain.Entities.TrendPoint> entityRows, string metricName)
    {
        var ordered = entityRows
            .Where(p => p.MetricName == metricName)
            .OrderByDescending(p => p.CapturedAt)
            .ToList();
        if (ordered.Count == 0) return (null, null);
        var latest = ordered[0].NumericValue;
        if (latest is null || ordered.Count < 2) return (latest, null);
        var previous = ordered[1].NumericValue;
        return previous is null ? (latest, null) : (latest, latest - previous);
    }

    private static string? LatestCategorical(
        IEnumerable<Domain.Entities.TrendPoint> entityRows, string metricName) =>
        entityRows
            .Where(p => p.MetricName == metricName)
            .OrderByDescending(p => p.CapturedAt)
            .Select(p => p.CategoricalValue)
            .FirstOrDefault();

    // -----------------------------------------------------------------
    // Entity name lookup
    // -----------------------------------------------------------------

    private async Task<IReadOnlyDictionary<(TrendEntityType, Guid), string>> ResolveEntityNamesAsync(
        IReadOnlyList<Domain.Entities.TrendPoint> points, CancellationToken ct)
    {
        var brandIds = points.Where(p => p.EntityType == TrendEntityType.Brand)
            .Select(p => p.EntityId).Distinct().ToList();
        var competitorIds = points.Where(p => p.EntityType == TrendEntityType.Competitor)
            .Select(p => p.EntityId).Distinct().ToList();

        var brandNames = brandIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _db.Brands.AsNoTracking()
                .Where(b => brandIds.Contains(b.Id))
                .ToDictionaryAsync(b => b.Id, b => b.Name, ct);
        var competitorNames = competitorIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _db.Competitors.AsNoTracking()
                .Where(c => competitorIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        var dict = new Dictionary<(TrendEntityType, Guid), string>();
        foreach (var (id, name) in brandNames) dict[(TrendEntityType.Brand, id)] = name;
        foreach (var (id, name) in competitorNames) dict[(TrendEntityType.Competitor, id)] = name;
        return dict;
    }
}

