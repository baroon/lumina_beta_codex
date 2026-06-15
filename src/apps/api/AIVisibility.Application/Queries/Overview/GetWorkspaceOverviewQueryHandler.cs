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
        var audienceIdFilter = await ResolveAudienceIdSetAsync(request.AudienceNames, cancellationToken);
        // Sentiment + Platform — Platform narrows BuildHeroAsync's
        // PromptRun source (so every downstream count is platform-scoped);
        // Sentiment narrows Mention-counting queries within the hero
        // computation. Following the existing dim-filter convention,
        // both apply ONLY to hero counts here — the trend series, top
        // entities table, and Phase-4 measurement-model sections (brand
        // attributes, co-mentions, risk flags, comparisons, topic
        // ownership, factual claims) operate on workspace-wide aggregates
        // and don't honor the dim filters either.
        var sentimentFilter = ResolveSentimentSet(request.SentimentValues);
        var platformIdFilter = await ResolvePlatformIdSetAsync(request.PlatformCodes, cancellationToken);

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
        // Apply optional tracker-scope filter — intersect with the
        // workspace's own trackers so a caller can't read another
        // workspace's data by passing arbitrary GUIDs. Null/empty filter
        // means "no filter" (matches the LensCodes/TopicNames convention).
        if (request.TrackerIds is { Count: > 0 })
        {
            var requested = new HashSet<Guid>(request.TrackerIds);
            trackerIds = trackerIds.Where(id => requested.Contains(id)).ToList();
        }
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

        var hero = await BuildHeroAsync(scanIds, trackedBrandIds, lensIdFilter, topicIdFilter, productIdFilter, marketIdFilter, audienceIdFilter, platformIdFilter, sentimentFilter, cancellationToken);

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
            previousHero = await BuildHeroAsync(prevScanIds, trackedBrandIds, lensIdFilter, topicIdFilter, productIdFilter, marketIdFilter, audienceIdFilter, platformIdFilter, sentimentFilter, cancellationToken);
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
        var topBrandAttributes = await BuildTopBrandAttributesAsync(
            scanIds, trackedBrandIds, cancellationToken);
        var coMentions = await BuildCoMentionsAsync(
            scanIds, trackedBrandIds, competitorRows, cancellationToken);
        var topBrandRiskFlags = await BuildTopBrandRiskFlagsAsync(
            scanIds, trackedBrandIds, cancellationToken);
        var topBrandComparisons = await BuildTopBrandComparisonsAsync(
            scanIds, trackedBrandIds, cancellationToken);
        var topicOwnership = await BuildTopicOwnershipAsync(
            scanIds, trackedBrandIds, cancellationToken);
        var trackedBrandsById = trackedBrands.ToDictionary(b => b.Id, b => b.Name);
        var recentFactualClaims = await BuildRecentFactualClaimsAsync(
            scanIds, trackedBrandsById, cancellationToken);

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
            TopEntities: topEntities,
            TopBrandAttributes: topBrandAttributes,
            CoMentions: coMentions,
            TopBrandRiskFlags: topBrandRiskFlags,
            TopBrandComparisons: topBrandComparisons,
            TopicOwnership: topicOwnership,
            RecentFactualClaims: recentFactualClaims);
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
            new WorkspaceHeroDto(0, 0, 0, null, null, null),
            null,
            Array.Empty<EntityTrendSeriesDto>(),
            Array.Empty<WorkspaceTopEntityRowDto>(),
            Array.Empty<WorkspaceBrandAttributeDto>(),
            Array.Empty<WorkspaceCoMentionDto>(),
            Array.Empty<WorkspaceBrandRiskFlagDto>(),
            Array.Empty<WorkspaceBrandComparisonDto>(),
            Array.Empty<WorkspaceTopicOwnershipDto>(),
            Array.Empty<WorkspaceFactualClaimDto>());

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
        HashSet<Guid>? audienceIdFilter,
        HashSet<Guid>? platformIdFilter,
        HashSet<Sentiment>? sentimentFilter,
        CancellationToken ct)
    {
        if (scanIds.Count == 0)
        {
            return new WorkspaceHeroDto(0, 0, 0, null, null, null);
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
        if (audienceIdFilter is not null)
        {
            promptRunsInScope = promptRunsInScope.Where(pr =>
                _db.PromptAudiences.Any(pa => pa.PromptId == pr.PromptId && audienceIdFilter.Contains(pa.AudienceId)));
        }
        if (platformIdFilter is not null)
        {
            promptRunsInScope = promptRunsInScope.Where(pr => platformIdFilter.Contains(pr.AIPlatformId));
        }
        var promptRunIdsInScope = promptRunsInScope.Select(pr => pr.Id);

        var queries = await promptRunsInScope.CountAsync(ct);

        var answerIds = await _db.AIAnswers.AsNoTracking()
            .Where(a => promptRunIdsInScope.Contains(a.PromptRunId))
            .Select(a => a.Id)
            .ToListAsync(ct);
        var answerIdSet = answerIds.ToHashSet();

        var mentions = answerIdSet.Count == 0 ? 0 : await _db.Mentions.AsNoTracking()
            .CountAsync(
                m => answerIdSet.Contains(m.AIAnswerId)
                    && (sentimentFilter == null || sentimentFilter.Contains(m.Sentiment)),
                ct);
        var citations = answerIdSet.Count == 0 ? 0 : await _db.Citations.AsNoTracking()
            .CountAsync(c => answerIdSet.Contains(c.AIAnswerId), ct);

        // BrandMentionRate across the workspace: distinct answers with ≥1
        // tracked-brand mention / total answers. Cleaner than averaging
        // per-tracker rates when trackers have different prompt counts.
        double? brandMentionRate = null;
        HashSet<Guid> brandMentionedAnswerIdSet = new();
        if (answerIdSet.Count > 0)
        {
            brandMentionedAnswerIdSet = (await _db.Mentions.AsNoTracking()
                .Where(m => answerIdSet.Contains(m.AIAnswerId)
                    && m.EntityType == MentionEntityType.Brand
                    && trackedBrandIds.Contains(m.EntityId)
                    && (sentimentFilter == null || sentimentFilter.Contains(m.Sentiment)))
                .Select(m => m.AIAnswerId)
                .Distinct()
                .ToListAsync(ct))
                .ToHashSet();
            brandMentionRate = (double)brandMentionedAnswerIdSet.Count / answerIdSet.Count;
        }

        // BrandAbsenceRate: fraction of in-scope answers with NO tracked-
        // brand mention AND no Owned citation for ANY tracked brand.
        // Stricter than 1 - brandMentionRate because it also catches
        // "brand's site cited but brand wasn't named" — still a
        // visibility signal. Per-brand classification (Owned-ness depends
        // on which brand you're asking about) means we join citations to
        // BrandSourceClassification, not Citation.ClassifiedAs (which
        // was retired by Phase 4 Slice 0).
        double? brandAbsenceRate = null;
        if (answerIdSet.Count > 0)
        {
            var ownedCitedAnswerIds = await (
                from c in _db.Citations.AsNoTracking()
                join bsc in _db.BrandSourceClassifications.AsNoTracking()
                    on c.SourceId equals bsc.SourceId
                where answerIdSet.Contains(c.AIAnswerId)
                    && bsc.SourceType == SourceType.Owned
                    && trackedBrandIds.Contains(bsc.BrandId)
                select c.AIAnswerId)
                .Distinct()
                .ToListAsync(ct);
            var presentAnswerIds = new HashSet<Guid>(brandMentionedAnswerIdSet);
            foreach (var id in ownedCitedAnswerIds) presentAnswerIds.Add(id);
            var absentCount = answerIdSet.Count - presentAnswerIds.Count;
            brandAbsenceRate = (double)absentCount / answerIdSet.Count;
        }

        // BrandFirstMentionRate: among answers with ≥1 mention, fraction
        // where a tracked brand was the first-named entity by
        // FirstMentionPosition. Aggregates the per-mention positions in
        // memory because EF's window-function support is uneven.
        double? brandFirstMentionRate = null;
        if (answerIdSet.Count > 0)
        {
            var mentionMinPositions = await _db.Mentions.AsNoTracking()
                .Where(m => answerIdSet.Contains(m.AIAnswerId)
                    && (sentimentFilter == null || sentimentFilter.Contains(m.Sentiment)))
                .Select(m => new
                {
                    m.AIAnswerId,
                    m.EntityType,
                    m.EntityId,
                    m.FirstMentionPosition,
                })
                .ToListAsync(ct);
            var byAnswer = mentionMinPositions
                .GroupBy(m => m.AIAnswerId)
                .ToList();
            if (byAnswer.Count > 0)
            {
                var firstNamedBrandCount = byAnswer.Count(g =>
                {
                    var winner = g.OrderBy(m => m.FirstMentionPosition).First();
                    return winner.EntityType == MentionEntityType.Brand
                        && trackedBrandIds.Contains(winner.EntityId);
                });
                brandFirstMentionRate = (double)firstNamedBrandCount / byAnswer.Count;
            }
        }

        return new WorkspaceHeroDto(
            queries, mentions, citations, brandMentionRate, brandAbsenceRate, brandFirstMentionRate);
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
    // Top brand attributes (Phase 4 measurement-model expansion, item #10)
    // -----------------------------------------------------------------

    /// <summary>
    /// Workspace-wide top-N attributes the AI ascribed to any tracked
    /// brand. Joins MentionAttribute → Mention → AIAnswer → PromptRun →
    /// ScanRun so the scope mirrors the hero counts exactly. Aggregates
    /// from the leaf rows rather than re-summing per-scan
    /// <c>BrandTopAttribute</c> ScanMetric rows because each scan's
    /// rollup caps at 10 — broad-but-shallow attributes that hit #11+
    /// in many scans would otherwise vanish. Polarity at the workspace
    /// grain = mode polarity across the attribute's mentions; ties on
    /// polarity fall back to alphabetical for determinism, ties on
    /// count fall back to alphabetical on attribute name. Top 10.
    /// </summary>
    private async Task<IReadOnlyList<WorkspaceBrandAttributeDto>> BuildTopBrandAttributesAsync(
        IReadOnlyList<Guid> scanIds, HashSet<Guid> trackedBrandIds, CancellationToken ct)
    {
        if (scanIds.Count == 0) return Array.Empty<WorkspaceBrandAttributeDto>();

        var scanIdSet = scanIds.ToHashSet();

        // Pull (Name, Polarity) for every MentionAttribute attached to a
        // tracked-brand Mention whose answer's promptRun's scan is in
        // scope. The mentions table is the polymorphic mention spine;
        // brand-typed rows where EntityId is in trackedBrandIds are what
        // we want.
        var rows = await (
            from ma in _db.MentionAttributes.AsNoTracking()
            join m in _db.Mentions.AsNoTracking() on ma.MentionId equals m.Id
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            where m.EntityType == MentionEntityType.Brand
                && trackedBrandIds.Contains(m.EntityId)
                && scanIdSet.Contains(pr.ScanRunId)
            select new { ma.Name, ma.Polarity })
            .ToListAsync(ct);

        if (rows.Count == 0) return Array.Empty<WorkspaceBrandAttributeDto>();

        // Group by attribute name (LLM-emitted text, normalized
        // on-write); polarity is the mode across the rows.
        var grouped = rows
            .GroupBy(r => r.Name)
            .Select(g =>
            {
                var modePolarity = g.GroupBy(r => r.Polarity)
                    .OrderByDescending(pg => pg.Count())
                    .ThenBy(pg => pg.Key.ToString(), StringComparer.Ordinal)
                    .First().Key;
                return new
                {
                    Name = g.Key,
                    Polarity = modePolarity.ToString(),
                    MentionCount = g.Count(),
                };
            })
            .OrderByDescending(r => r.MentionCount)
            .ThenBy(r => r.Name, StringComparer.Ordinal)
            .Take(10)
            .Select((r, i) => new WorkspaceBrandAttributeDto(
                Rank: i + 1, Name: r.Name, Polarity: r.Polarity, MentionCount: r.MentionCount))
            .ToList();

        return grouped;
    }

    // -----------------------------------------------------------------
    // Recent factual claims (Phase 4 measurement-model expansion, item #14)
    // -----------------------------------------------------------------

    /// <summary>
    /// Recent factual claims the AI asserted about any tracked brand
    /// in scope. Joins FactualClaim → Mention → AIAnswer → PromptRun
    /// → ScanRun so the scope matches the rest of the workspace
    /// counts. Returns the latest 10 by CreatedAt desc — the surface
    /// is meant for reviewer triage ("here's what the AI claimed
    /// most recently; is it true?"), so the all-statuses view is
    /// useful: even Verified / Disputed claims show recent context.
    /// </summary>
    private async Task<IReadOnlyList<WorkspaceFactualClaimDto>> BuildRecentFactualClaimsAsync(
        IReadOnlyList<Guid> scanIds,
        Dictionary<Guid, string> trackedBrandsById,
        CancellationToken ct)
    {
        if (scanIds.Count == 0) return Array.Empty<WorkspaceFactualClaimDto>();

        var scanIdSet = scanIds.ToHashSet();
        var trackedBrandIdSet = trackedBrandsById.Keys.ToHashSet();

        var rows = await (
            from fc in _db.FactualClaims.AsNoTracking()
            join m in _db.Mentions.AsNoTracking() on fc.MentionId equals m.Id
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            where m.EntityType == MentionEntityType.Brand
                && trackedBrandIdSet.Contains(m.EntityId)
                && scanIdSet.Contains(pr.ScanRunId)
            orderby fc.CreatedAt descending
            select new
            {
                fc.Id, BrandId = m.EntityId, fc.Subject, fc.AssertedValue,
                fc.ClaimText, fc.EvidenceSnippet, fc.Verifiability, fc.ReviewStatus, fc.CreatedAt,
            })
            .Take(10)
            .ToListAsync(ct);

        return rows
            .Select(r => new WorkspaceFactualClaimDto(
                ClaimId: r.Id,
                BrandId: r.BrandId,
                BrandName: trackedBrandsById.TryGetValue(r.BrandId, out var name) ? name : string.Empty,
                Subject: r.Subject,
                AssertedValue: r.AssertedValue,
                ClaimText: r.ClaimText,
                EvidenceSnippet: r.EvidenceSnippet,
                Verifiability: r.Verifiability.ToString(),
                ReviewStatus: r.ReviewStatus.ToString(),
                CreatedAt: r.CreatedAt))
            .ToList();
    }

    // -----------------------------------------------------------------
    // Topic ownership (Phase 4 measurement-model expansion, item #18)
    // -----------------------------------------------------------------

    /// <summary>
    /// Workspace-wide topic-ownership rollup. For each topic name a
    /// scoped prompt is tagged with, returns the prompt count and the
    /// subset where ≥1 answer mentioned any tracked brand. The FE
    /// derives "ownership" = brandMentionedPromptCount / promptCount.
    /// Grouped by topic NAME (not Topic.Id) because per-brand Topic
    /// rows dedupe by display name at the FE picker — "Career advice"
    /// surfaces as one topic even when Acme and Beta each have their
    /// own Topic row. Ordered by total prompt count desc, then
    /// alphabetical for determinism. Top 10.
    /// </summary>
    private async Task<IReadOnlyList<WorkspaceTopicOwnershipDto>> BuildTopicOwnershipAsync(
        IReadOnlyList<Guid> scanIds, HashSet<Guid> trackedBrandIds, CancellationToken ct)
    {
        if (scanIds.Count == 0) return Array.Empty<WorkspaceTopicOwnershipDto>();

        var scanIdSet = scanIds.ToHashSet();

        // Distinct in-scope prompts (one row per (promptId, scoped at
        // least once) — the PromptRuns within scan window pin the
        // denominator universe).
        var promptIdsInScope = await _db.PromptRuns.AsNoTracking()
            .Where(pr => scanIdSet.Contains(pr.ScanRunId))
            .Select(pr => pr.PromptId)
            .Distinct()
            .ToListAsync(ct);
        if (promptIdsInScope.Count == 0) return Array.Empty<WorkspaceTopicOwnershipDto>();
        var promptIdSet = promptIdsInScope.ToHashSet();

        // For each (prompt, topic name) pair the prompt is tagged with.
        var promptTopicNames = await (
            from pt in _db.PromptTopics.AsNoTracking()
            join t in _db.Topics.AsNoTracking() on pt.TopicId equals t.Id
            where promptIdSet.Contains(pt.PromptId)
            select new { pt.PromptId, t.Name })
            .ToListAsync(ct);
        if (promptTopicNames.Count == 0) return Array.Empty<WorkspaceTopicOwnershipDto>();

        // In-scope prompts where ≥1 answer mentioned a tracked brand —
        // the numerator universe. Pull once and intersect per-topic.
        var brandMentionedPromptIds = await (
            from m in _db.Mentions.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            where m.EntityType == MentionEntityType.Brand
                && trackedBrandIds.Contains(m.EntityId)
                && scanIdSet.Contains(pr.ScanRunId)
            select pr.PromptId)
            .Distinct()
            .ToListAsync(ct);
        var brandMentionedPromptIdSet = brandMentionedPromptIds.ToHashSet();

        return promptTopicNames
            .GroupBy(pt => pt.Name)
            .Select(g =>
            {
                var distinctPrompts = g.Select(pt => pt.PromptId).Distinct().ToList();
                return new
                {
                    TopicName = g.Key,
                    PromptCount = distinctPrompts.Count,
                    BrandMentionedPromptCount = distinctPrompts.Count(brandMentionedPromptIdSet.Contains),
                };
            })
            .OrderByDescending(r => r.PromptCount)
            .ThenBy(r => r.TopicName, StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .Select((r, i) => new WorkspaceTopicOwnershipDto(
                Rank: i + 1,
                TopicName: r.TopicName,
                PromptCount: r.PromptCount,
                BrandMentionedPromptCount: r.BrandMentionedPromptCount))
            .ToList();
    }

    // -----------------------------------------------------------------
    // Top brand comparisons (Phase 4 measurement-model expansion, item #15)
    // -----------------------------------------------------------------

    /// <summary>
    /// Workspace-wide rollup of head-to-head comparisons the AI drew
    /// for any tracked brand. Per-aspect: count of wins (where the
    /// brand was the comparison's winner) and losses (where the vs
    /// entity won). Ties / unclear judgments aren't stored at
    /// extraction so they don't reach here. Joined source-side
    /// (MentionComparison → Mention → AIAnswer → PromptRun → ScanRun)
    /// so the scope matches the rest of the workspace counts. Sorted
    /// by total comparisons desc, then alphabetical aspect for
    /// determinism. Top 10.
    /// </summary>
    private async Task<IReadOnlyList<WorkspaceBrandComparisonDto>> BuildTopBrandComparisonsAsync(
        IReadOnlyList<Guid> scanIds, HashSet<Guid> trackedBrandIds, CancellationToken ct)
    {
        if (scanIds.Count == 0) return Array.Empty<WorkspaceBrandComparisonDto>();

        var scanIdSet = scanIds.ToHashSet();

        var rows = await (
            from cmp in _db.MentionComparisons.AsNoTracking()
            join m in _db.Mentions.AsNoTracking() on cmp.MentionId equals m.Id
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            where m.EntityType == MentionEntityType.Brand
                && trackedBrandIds.Contains(m.EntityId)
                && scanIdSet.Contains(pr.ScanRunId)
            select new { cmp.OnAspect, cmp.WinnerIsThisMention })
            .ToListAsync(ct);

        if (rows.Count == 0) return Array.Empty<WorkspaceBrandComparisonDto>();

        var grouped = rows
            .GroupBy(r => r.OnAspect)
            .Select(g => new
            {
                Aspect = g.Key,
                WinCount = g.Count(r => r.WinnerIsThisMention),
                LossCount = g.Count(r => !r.WinnerIsThisMention),
            })
            .OrderByDescending(r => r.WinCount + r.LossCount)
            .ThenBy(r => r.Aspect, StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .Select((r, i) => new WorkspaceBrandComparisonDto(
                Rank: i + 1, Aspect: r.Aspect, WinCount: r.WinCount, LossCount: r.LossCount))
            .ToList();

        return grouped;
    }

    // -----------------------------------------------------------------
    // Top brand risk flags (Phase 4 measurement-model expansion, item #11)
    // -----------------------------------------------------------------

    /// <summary>
    /// Workspace-wide rollup of the AI-extracted risk language attached
    /// to any tracked brand. Joins MentionRiskFlag → Mention → AIAnswer
    /// → PromptRun → ScanRun so the scope mirrors the hero counts.
    /// Aggregates from the leaf rows rather than re-summing the per-scan
    /// <c>BrandRiskFlagCount</c> ScanMetric — that metric is a single
    /// integer that loses the (flag type, severity) detail this card
    /// surfaces. Severity at the workspace grain = mode severity per
    /// flag type; ties on count fall back to alphabetical for
    /// determinism. Top 10.
    /// </summary>
    private async Task<IReadOnlyList<WorkspaceBrandRiskFlagDto>> BuildTopBrandRiskFlagsAsync(
        IReadOnlyList<Guid> scanIds, HashSet<Guid> trackedBrandIds, CancellationToken ct)
    {
        if (scanIds.Count == 0) return Array.Empty<WorkspaceBrandRiskFlagDto>();

        var scanIdSet = scanIds.ToHashSet();

        var rows = await (
            from rf in _db.MentionRiskFlags.AsNoTracking()
            join m in _db.Mentions.AsNoTracking() on rf.MentionId equals m.Id
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            where m.EntityType == MentionEntityType.Brand
                && trackedBrandIds.Contains(m.EntityId)
                && scanIdSet.Contains(pr.ScanRunId)
            select new { rf.FlagType, rf.Severity })
            .ToListAsync(ct);

        if (rows.Count == 0) return Array.Empty<WorkspaceBrandRiskFlagDto>();

        var grouped = rows
            .GroupBy(r => r.FlagType)
            .Select(g =>
            {
                var modeSeverity = g.GroupBy(r => r.Severity)
                    .OrderByDescending(sg => sg.Count())
                    .ThenByDescending(sg => (int)sg.Key) // High wins ties over Low
                    .First().Key;
                return new
                {
                    FlagType = g.Key,
                    Severity = modeSeverity.ToString(),
                    MentionCount = g.Count(),
                };
            })
            .OrderByDescending(r => r.MentionCount)
            .ThenBy(r => r.FlagType, StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .Select((r, i) => new WorkspaceBrandRiskFlagDto(
                Rank: i + 1, FlagType: r.FlagType, Severity: r.Severity, MentionCount: r.MentionCount))
            .ToList();

        return grouped;
    }

    // -----------------------------------------------------------------
    // Co-mentions (Phase 4 measurement-model expansion, item #8)
    // -----------------------------------------------------------------

    /// <summary>
    /// Workspace-wide per-competitor co-mention rollup. For each tracked
    /// competitor in the workspace, counts distinct in-scope answers
    /// where BOTH a tracked brand AND this competitor were mentioned.
    /// Computed from the Mentions spine rather than the MentionPair
    /// table because we need the unrelated "competitor mentioned without
    /// our brand" count too (it's the denominator the FE divides by to
    /// get "% of competitor mentions that share the conversation").
    /// Competitors with zero in-scope mentions are dropped — they'd
    /// crowd the chart with empty bars. Ordered by co-mention count
    /// desc, then alphabetically by name.
    /// </summary>
    private async Task<IReadOnlyList<WorkspaceCoMentionDto>> BuildCoMentionsAsync(
        IReadOnlyList<Guid> scanIds,
        HashSet<Guid> trackedBrandIds,
        IReadOnlyList<WorkspaceCompetitorDto> competitors,
        CancellationToken ct)
    {
        if (scanIds.Count == 0 || competitors.Count == 0)
            return Array.Empty<WorkspaceCoMentionDto>();

        var scanIdSet = scanIds.ToHashSet();
        var competitorIdSet = competitors.Select(c => c.CompetitorId).ToHashSet();

        // In-scope answer ids — bounded by the workspace scans.
        var answerIds = await _db.AIAnswers.AsNoTracking()
            .Where(a => _db.PromptRuns.Any(pr =>
                pr.Id == a.PromptRunId && scanIdSet.Contains(pr.ScanRunId)))
            .Select(a => a.Id)
            .ToListAsync(ct);
        if (answerIds.Count == 0) return Array.Empty<WorkspaceCoMentionDto>();

        var answerIdSet = answerIds.ToHashSet();

        // Distinct in-scope answers where ANY tracked brand was mentioned.
        var brandAnswerIds = await _db.Mentions.AsNoTracking()
            .Where(m => answerIdSet.Contains(m.AIAnswerId)
                && m.EntityType == MentionEntityType.Brand
                && trackedBrandIds.Contains(m.EntityId))
            .Select(m => m.AIAnswerId)
            .Distinct()
            .ToListAsync(ct);
        var brandAnswerIdSet = brandAnswerIds.ToHashSet();

        // All competitor mentions in scope (Mention rows). We collapse to
        // distinct (competitorId, answerId) pairs in memory because EF's
        // grouped distinct count has uneven provider support.
        var competitorMentionPairs = await _db.Mentions.AsNoTracking()
            .Where(m => answerIdSet.Contains(m.AIAnswerId)
                && m.EntityType == MentionEntityType.Competitor
                && competitorIdSet.Contains(m.EntityId))
            .Select(m => new { CompetitorId = m.EntityId, m.AIAnswerId })
            .ToListAsync(ct);

        var byCompetitor = competitorMentionPairs
            .GroupBy(p => p.CompetitorId)
            .ToDictionary(g => g.Key, g => g.Select(p => p.AIAnswerId).Distinct().ToHashSet());

        return competitors
            .Where(c => byCompetitor.ContainsKey(c.CompetitorId))
            .Select(c =>
            {
                var ids = byCompetitor[c.CompetitorId];
                var coMention = ids.Count(id => brandAnswerIdSet.Contains(id));
                return new WorkspaceCoMentionDto(
                    CompetitorId: c.CompetitorId,
                    CompetitorName: c.Name,
                    CoMentionCount: coMention,
                    CompetitorMentionCount: ids.Count);
            })
            .OrderByDescending(r => r.CoMentionCount)
            .ThenBy(r => r.CompetitorName, StringComparer.OrdinalIgnoreCase)
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

    private async Task<HashSet<Guid>?> ResolveAudienceIdSetAsync(
        IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names is null || names.Count == 0) return null;
        var workspaceId = _workspace.WorkspaceId;
        var ids = await _db.Audiences.AsNoTracking()
            .Where(a => names.Contains(a.Name)
                && _db.Brands.Any(b => b.Id == a.BrandId && b.WorkspaceId == workspaceId))
            .Select(a => a.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    /// <summary>
    /// Resolve Sentiment-enum names ("Positive" / "Neutral" / etc.) to a
    /// HashSet of the enum values. Null / empty input ⇒ null out, meaning
    /// "no sentiment filter". Unknown strings are dropped silently — the
    /// FE shouldn't be able to send them, but a stale URL link or typo
    /// shouldn't 500 the API. Pure (no DB hit).
    /// </summary>
    private static HashSet<Sentiment>? ResolveSentimentSet(IReadOnlyList<string>? values)
    {
        if (values is null || values.Count == 0) return null;
        var set = new HashSet<Sentiment>();
        foreach (var v in values)
        {
            if (Enum.TryParse<Sentiment>(v, ignoreCase: false, out var parsed))
            {
                set.Add(parsed);
            }
        }
        return set;
    }

    /// <summary>
    /// Resolve AIPlatform.Code strings ("openai" / "claude" / "gemini" /
    /// "perplexity" / etc.) to a HashSet of AIPlatform.Id. Null / empty
    /// input ⇒ null out, meaning "no platform filter". Codes that don't
    /// match a platform row are dropped silently for the same reason as
    /// {@link ResolveSentimentSet}.
    /// </summary>
    private async Task<HashSet<Guid>?> ResolvePlatformIdSetAsync(
        IReadOnlyList<string>? codes, CancellationToken ct)
    {
        if (codes is null || codes.Count == 0) return null;
        var ids = await _db.AIPlatforms.AsNoTracking()
            .Where(p => codes.Contains(p.Code))
            .Select(p => p.Id)
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
