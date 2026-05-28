using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetWorkspaceOverviewQueryHandler
    : IRequestHandler<GetWorkspaceOverviewQuery, WorkspaceOverviewDto>
{
    private const int DefaultDays = 30;
    private const int MaxDays = 365;

    private static readonly HashSet<string> CategoricalMetrics = new(StringComparer.Ordinal)
    {
        TrendMetrics.OverallSentiment,
    };

    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetWorkspaceOverviewQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<WorkspaceOverviewDto> Handle(
        GetWorkspaceOverviewQuery request, CancellationToken cancellationToken)
    {
        var days = request.Days <= 0 ? DefaultDays : Math.Min(request.Days, MaxDays);
        var windowStart = DateTime.UtcNow.AddDays(-days);
        var workspaceId = _workspace.WorkspaceId;

        // Tracked brands in the workspace.
        var trackedBrands = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .OrderBy(b => b.Name)
            .Select(b => new { b.Id, b.Name })
            .ToListAsync(cancellationToken);
        var trackedBrandIds = trackedBrands.Select(b => b.Id).ToHashSet();

        if (trackedBrands.Count == 0)
        {
            return EmptyDto(workspaceId, days, windowStart);
        }

        // Every tracker for those brands.
        var trackerIds = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => trackedBrandIds.Contains(t.BrandId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        if (trackerIds.Count == 0)
        {
            return EmptyDto(workspaceId, days, windowStart, trackedBrands.Select(b => new TrackedBrandDto(b.Id, b.Name)).ToList());
        }

        // Distinct competitors across all tracker-competitor links, de-duped by Competitor.Id.
        var competitors = await (
            from tc in _db.TrackerCompetitors.AsNoTracking()
            join c in _db.Competitors.AsNoTracking() on tc.CompetitorId equals c.Id
            where trackerIds.Contains(tc.TrackerConfigurationId)
            select new { c.Id, c.Name }
        ).Distinct().ToListAsync(cancellationToken);
        var competitorRows = competitors
            .GroupBy(c => c.Id)
            .Select(g => new WorkspaceCompetitorDto(g.Key, g.First().Name))
            .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Scan ids in window across the workspace.
        var scanIds = await _db.ScanRuns.AsNoTracking()
            .Where(s => trackerIds.Contains(s.TrackerConfigurationId) && s.StartedAt >= windowStart)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var hero = await BuildHeroAsync(scanIds, trackedBrandIds, cancellationToken);

        var trendPoints = await _db.TrendPoints.AsNoTracking()
            .Where(p => trackerIds.Contains(p.TrackerConfigurationId)
                && p.CapturedAt >= windowStart)
            .OrderBy(p => p.CapturedAt)
            .ToListAsync(cancellationToken);

        var entityNames = await ResolveEntityNamesAsync(trendPoints, cancellationToken);
        var series = BuildSeries(trendPoints, entityNames);
        var topEntities = BuildTopEntities(trendPoints, entityNames, trackedBrandIds);

        return new WorkspaceOverviewDto(
            WorkspaceId: workspaceId,
            Days: days,
            WindowStart: windowStart,
            TrackedBrands: trackedBrands.Select(b => new TrackedBrandDto(b.Id, b.Name)).ToList(),
            Competitors: competitorRows,
            ScanCount: scanIds.Count,
            Hero: hero,
            Series: series,
            TopEntities: topEntities);
    }

    private static WorkspaceOverviewDto EmptyDto(
        Guid workspaceId, int days, DateTime windowStart,
        IReadOnlyList<TrackedBrandDto>? trackedBrands = null)
        => new(
            workspaceId, days, windowStart,
            trackedBrands ?? Array.Empty<TrackedBrandDto>(),
            Array.Empty<WorkspaceCompetitorDto>(),
            0,
            new WorkspaceHeroDto(0, 0, 0, null),
            Array.Empty<EntityTrendSeriesDto>(),
            Array.Empty<WorkspaceTopEntityRowDto>());

    // -----------------------------------------------------------------
    // Hero counts (D11) — workspace-wide totals + cross-brand mention rate
    // -----------------------------------------------------------------

    private async Task<WorkspaceHeroDto> BuildHeroAsync(
        IReadOnlyList<Guid> scanIds, HashSet<Guid> trackedBrandIds, CancellationToken ct)
    {
        if (scanIds.Count == 0)
        {
            return new WorkspaceHeroDto(0, 0, 0, null);
        }

        var scanIdSet = scanIds.ToHashSet();

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

        // BrandMentionRate across the workspace: distinct answers with ≥1
        // tracked-brand mention / total answers. Cleaner than averaging
        // per-tracker rates when trackers have different prompt counts.
        double? brandMentionRate = null;
        if (answerIdSet.Count > 0)
        {
            var brandMentionedAnswerIds = await _db.Mentions.AsNoTracking()
                .Where(m => answerIdSet.Contains(m.AIAnswerId)
                    && m.EntityType == MentionEntityType.Brand
                    && trackedBrandIds.Contains(m.EntityId))
                .Select(m => m.AIAnswerId)
                .Distinct()
                .CountAsync(ct);
            brandMentionRate = (double)brandMentionedAnswerIds / answerIdSet.Count;
        }

        return new WorkspaceHeroDto(queries, mentions, citations, brandMentionRate);
    }

    // -----------------------------------------------------------------
    // Trend series — collapse (entity, metric) across all trackers
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
    // Top Entities (D13)
    // -----------------------------------------------------------------

    private static IReadOnlyList<WorkspaceTopEntityRowDto> BuildTopEntities(
        IReadOnlyList<Domain.Entities.TrendPoint> points,
        IReadOnlyDictionary<(TrendEntityType, Guid), string> entityNames,
        HashSet<Guid> trackedBrandIds)
    {
        var byEntity = points
            .GroupBy(p => (p.EntityType, p.EntityId))
            .ToList();

        var rows = new List<WorkspaceTopEntityRowDto>();
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
            var (sentiment, sentimentDelta) = isBrand
                ? LatestCategoricalAndDelta(entityGroup, TrendMetrics.OverallSentiment)
                : (null, null);

            rows.Add(new WorkspaceTopEntityRowDto(
                EntityType: entityType.ToString(),
                EntityId: entityId,
                Name: name,
                IsTrackedBrand: isBrand && trackedBrandIds.Contains(entityId),
                Visibility: visibility,
                VisibilityDelta: visibilityDelta,
                ShareOfVoice: sov,
                ShareOfVoiceDelta: sovDelta,
                Sentiment: sentiment,
                SentimentDelta: sentimentDelta));
        }

        // Tracked brands first (alpha); then everyone else by Visibility desc.
        return rows
            .OrderByDescending(r => r.IsTrackedBrand)
            .ThenBy(r => r.IsTrackedBrand ? r.Name : string.Empty, StringComparer.OrdinalIgnoreCase)
            .ThenByDescending(r => r.IsTrackedBrand ? 0 : (r.Visibility ?? double.NegativeInfinity))
            .ThenBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

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

    /// <summary>
    /// Returns (latestCategoryString, delta) where delta = latestScore
    /// minus previousScore. Score encoding: Positive=+1, Neutral=0,
    /// Mixed=0, Negative=-1. Unknown / unmapped categories score as
    /// null and propagate a null delta. Delta is also null when fewer
    /// than 2 points exist.
    /// </summary>
    private static (string? Latest, double? Delta) LatestCategoricalAndDelta(
        IEnumerable<Domain.Entities.TrendPoint> entityRows, string metricName)
    {
        var ordered = entityRows
            .Where(p => p.MetricName == metricName)
            .OrderByDescending(p => p.CapturedAt)
            .Select(p => p.CategoricalValue)
            .ToList();
        if (ordered.Count == 0) return (null, null);
        var latestCategory = ordered[0];
        if (ordered.Count < 2) return (latestCategory, null);
        var latestScore = SentimentScore(latestCategory);
        var previousScore = SentimentScore(ordered[1]);
        if (latestScore is null || previousScore is null) return (latestCategory, null);
        return (latestCategory, latestScore.Value - previousScore.Value);
    }

    private static double? SentimentScore(string? category) => category switch
    {
        "Positive" => 1.0,
        "Neutral" => 0.0,
        "Mixed" => 0.0,
        "Negative" => -1.0,
        _ => null, // "Unknown" or anything we don't recognise
    };

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
