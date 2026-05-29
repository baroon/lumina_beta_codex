using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetWorkspaceOverviewQueryHandler
    : IRequestHandler<GetWorkspaceOverviewQuery, WorkspaceOverviewDto>
{
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
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        // Null lens filter ⇒ "all lenses" (skip the predicate). Non-null
        // (possibly empty) ⇒ filter PromptRuns by Prompt.LensId. An empty
        // resolved set is the honest "no lens matched" outcome — hero
        // counts come out as zero, which is what we want.
        var lensIdFilter = await ResolveLensIdSetAsync(request.LensCodes, cancellationToken);
        // Same semantics for topics — resolved from names (the dedup
        // unit the FE picker operates on) to all matching Topic.Id rows
        // so duplicates across brands / discovery runs are honored.
        var topicIdFilter = await ResolveTopicIdSetAsync(request.TopicNames, cancellationToken);
        var productIdFilter = await ResolveProductIdSetAsync(request.ProductNames, cancellationToken);
        var marketIdFilter = await ResolveMarketIdSetAsync(request.MarketNames, cancellationToken);

        // Tracked brands in the workspace.
        var trackedBrands = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .OrderBy(b => b.Name)
            .Select(b => new { b.Id, b.Name })
            .ToListAsync(cancellationToken);
        var trackedBrandIds = trackedBrands.Select(b => b.Id).ToHashSet();

        if (trackedBrands.Count == 0)
        {
            return EmptyDto(workspaceId, windowFrom, windowTo);
        }

        // Every tracker for those brands.
        var trackerIds = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => trackedBrandIds.Contains(t.BrandId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        if (trackerIds.Count == 0)
        {
            return EmptyDto(workspaceId, windowFrom, windowTo, trackedBrands.Select(b => new TrackedBrandDto(b.Id, b.Name)).ToList());
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
            .Where(s => trackerIds.Contains(s.TrackerConfigurationId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var hero = await BuildHeroAsync(scanIds, trackedBrandIds, lensIdFilter, topicIdFilter, productIdFilter, marketIdFilter, cancellationToken);

        // Hero counts for the immediately-preceding equivalent window so
        // the FE can render an up/down delta chip on each hero tile.
        // "All time" mode has no notion of "previous" so we skip the
        // second query.
        WorkspaceHeroDto? previousHero = null;
        if (TryGetPreviousWindow(windowFrom, windowTo, out var prevFrom, out var prevTo))
        {
            var prevScanIds = await _db.ScanRuns.AsNoTracking()
                .Where(s => trackerIds.Contains(s.TrackerConfigurationId)
                    && s.StartedAt >= prevFrom
                    && s.StartedAt < prevTo)
                .Select(s => s.Id)
                .ToListAsync(cancellationToken);
            previousHero = await BuildHeroAsync(prevScanIds, trackedBrandIds, lensIdFilter, topicIdFilter, productIdFilter, marketIdFilter, cancellationToken);
        }

        var trendPoints = await _db.TrendPoints.AsNoTracking()
            .Where(p => trackerIds.Contains(p.TrackerConfigurationId)
                && (windowFrom == null || p.CapturedAt >= windowFrom)
                && p.CapturedAt <= windowTo)
            .OrderBy(p => p.CapturedAt)
            .ToListAsync(cancellationToken);

        var entityNames = await ResolveEntityNamesAsync(trendPoints, cancellationToken);
        var series = BuildSeries(trendPoints, entityNames);
        var topEntities = BuildTopEntities(trendPoints, entityNames, trackedBrandIds);

        return new WorkspaceOverviewDto(
            WorkspaceId: workspaceId,
            From: windowFrom,
            To: windowTo,
            TrackedBrands: trackedBrands.Select(b => new TrackedBrandDto(b.Id, b.Name)).ToList(),
            Competitors: competitorRows,
            ScanCount: scanIds.Count,
            Hero: hero,
            PreviousHero: previousHero,
            Series: series,
            TopEntities: topEntities);
    }

    /// <summary>
    /// Compute the equivalent window immediately before the current one
    /// — same length, shifted back. Returns <c>false</c> when the caller
    /// asked for "all time" (no upper bound on the past, no meaningful
    /// previous span).
    /// </summary>
    private static bool TryGetPreviousWindow(
        DateTime? windowFrom, DateTime windowTo, out DateTime previousFrom, out DateTime previousTo)
    {
        if (windowFrom is null)
        {
            previousFrom = default;
            previousTo = default;
            return false;
        }
        var length = windowTo - windowFrom.Value;
        previousTo = windowFrom.Value;
        previousFrom = windowFrom.Value - length;
        return true;
    }

    private static WorkspaceOverviewDto EmptyDto(
        Guid workspaceId, DateTime? windowFrom, DateTime windowTo,
        IReadOnlyList<TrackedBrandDto>? trackedBrands = null)
        => new(
            workspaceId, windowFrom, windowTo,
            trackedBrands ?? Array.Empty<TrackedBrandDto>(),
            Array.Empty<WorkspaceCompetitorDto>(),
            0,
            new WorkspaceHeroDto(0, 0, 0, null),
            null,
            Array.Empty<EntityTrendSeriesDto>(),
            Array.Empty<WorkspaceTopEntityRowDto>());

    // -----------------------------------------------------------------
    // Hero counts (D11) — workspace-wide totals + cross-brand mention rate
    // -----------------------------------------------------------------

    private async Task<WorkspaceHeroDto> BuildHeroAsync(
        IReadOnlyList<Guid> scanIds,
        HashSet<Guid> trackedBrandIds,
        HashSet<Guid>? lensIdFilter,
        HashSet<Guid>? topicIdFilter,
        HashSet<Guid>? productIdFilter,
        HashSet<Guid>? marketIdFilter,
        CancellationToken ct)
    {
        if (scanIds.Count == 0)
        {
            return new WorkspaceHeroDto(0, 0, 0, null);
        }

        var scanIdSet = scanIds.ToHashSet();

        // Apply the lens + topic + product + market filters at the
        // PromptRun source so every downstream count (answers → mentions
        // → citations) flows from the same scoped set.
        var promptRunsInScope = _db.PromptRuns.AsNoTracking()
            .Where(pr => scanIdSet.Contains(pr.ScanRunId));
        if (lensIdFilter is not null)
        {
            promptRunsInScope = promptRunsInScope.Where(pr =>
                _db.Prompts.Any(p => p.Id == pr.PromptId && lensIdFilter.Contains(p.LensId)));
        }
        if (topicIdFilter is not null)
        {
            promptRunsInScope = promptRunsInScope.Where(pr =>
                _db.PromptTopics.Any(pt => pt.PromptId == pr.PromptId && topicIdFilter.Contains(pt.TopicId)));
        }
        if (productIdFilter is not null)
        {
            promptRunsInScope = promptRunsInScope.Where(pr =>
                _db.PromptProducts.Any(pp => pp.PromptId == pr.PromptId && productIdFilter.Contains(pp.ProductId)));
        }
        if (marketIdFilter is not null)
        {
            promptRunsInScope = promptRunsInScope.Where(pr =>
                _db.PromptMarkets.Any(pm => pm.PromptId == pr.PromptId && marketIdFilter.Contains(pm.MarketId)));
        }
        var promptRunIdsInScope = promptRunsInScope.Select(pr => pr.Id);

        var queries = await promptRunsInScope.CountAsync(ct);

        var answerIds = await _db.AIAnswers.AsNoTracking()
            .Where(a => promptRunIdsInScope.Contains(a.PromptRunId))
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

    /// <summary>
    /// Look up the Lens.Id set that matches the requested codes. Null in
    /// (or empty list in) ⇒ null out, meaning "no lens filter". Returns
    /// a possibly-empty HashSet otherwise — the caller treats empty as
    /// "no lens matched the codes" and ends up with zero counts, which
    /// is the honest answer for an invalid code.
    /// </summary>
    private async Task<HashSet<Guid>?> ResolveLensIdSetAsync(
        IReadOnlyList<string>? codes, CancellationToken ct)
    {
        if (codes is null || codes.Count == 0) return null;
        var ids = await _db.Lenses.AsNoTracking()
            .Where(l => codes.Contains(l.Code))
            .Select(l => l.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    /// <summary>
    /// Resolve topic names (case-sensitive match — names come from the
    /// same FE list the user picks from) to every matching Topic.Id in
    /// the current workspace. Topics are per-brand so the same name may
    /// resolve to multiple ids; we want all of them so duplicates from
    /// repeated discovery runs are honored.
    /// </summary>
    private async Task<HashSet<Guid>?> ResolveTopicIdSetAsync(
        IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names is null || names.Count == 0) return null;
        var workspaceId = _workspace.WorkspaceId;
        var ids = await _db.Topics.AsNoTracking()
            .Where(t => names.Contains(t.Name)
                && _db.Brands.Any(b => b.Id == t.BrandId && b.WorkspaceId == workspaceId))
            .Select(t => t.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    private async Task<HashSet<Guid>?> ResolveProductIdSetAsync(
        IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names is null || names.Count == 0) return null;
        var workspaceId = _workspace.WorkspaceId;
        var ids = await _db.Products.AsNoTracking()
            .Where(p => names.Contains(p.Name)
                && _db.Brands.Any(b => b.Id == p.BrandId && b.WorkspaceId == workspaceId))
            .Select(p => p.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    private async Task<HashSet<Guid>?> ResolveMarketIdSetAsync(
        IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names is null || names.Count == 0) return null;
        var workspaceId = _workspace.WorkspaceId;
        var ids = await _db.Markets.AsNoTracking()
            .Where(m => names.Contains(m.Name)
                && _db.Brands.Any(b => b.Id == m.BrandId && b.WorkspaceId == workspaceId))
            .Select(m => m.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

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
