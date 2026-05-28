using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetTrackerCompetitiveQueryHandler
    : IRequestHandler<GetTrackerCompetitiveQuery, TrackerCompetitiveDto?>
{
    private const int DefaultDays = 30;
    private const int MaxDays = 365;
    private const int TopDomainLimit = 10;

    private readonly IAppDbContext _db;

    public GetTrackerCompetitiveQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<TrackerCompetitiveDto?> Handle(
        GetTrackerCompetitiveQuery request, CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => t.Id == request.TrackerId)
            .Select(t => new { t.Id, t.BrandId, BrandName = t.Brand.Name })
            .FirstOrDefaultAsync(cancellationToken);
        if (tracker == null) return null;

        var days = request.Days <= 0 ? DefaultDays : Math.Min(request.Days, MaxDays);
        var windowStart = DateTime.UtcNow.AddDays(-days);

        // Answers in window — the seed set every downstream aggregation joins
        // through. AnswerSignal join filters to answers the extractor actually
        // produced signals for (matches the aggregator's view of "successful
        // answers"; bad-JSON answers dropped by the per-answer catch are
        // excluded).
        var answerIds = await (
            from a in _db.AIAnswers.AsNoTracking()
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join sig in _db.AnswerSignals.AsNoTracking() on a.Id equals sig.AIAnswerId
            where pr.ScanRunId == s.Id
                && s.TrackerConfigurationId == request.TrackerId
                && s.StartedAt >= windowStart
            select a.Id
        ).ToListAsync(cancellationToken);
        var answerIdSet = answerIds.ToHashSet();

        if (answerIdSet.Count == 0)
        {
            return new TrackerCompetitiveDto(
                tracker.Id, tracker.BrandId, tracker.BrandName,
                days, windowStart,
                Array.Empty<DomainRowDto>(),
                Array.Empty<DomainTypeShareDto>(),
                Array.Empty<EntityMentionDto>(),
                Array.Empty<CompetitiveGapDto>(),
                Array.Empty<EntityRateDto>());
        }

        var topDomains = await BuildTopDomainsAsync(answerIdSet, tracker.BrandId, cancellationToken);
        var domainTypes = BuildDomainTypes(topDomains);
        var mentions = await _db.Mentions.AsNoTracking()
            .Where(m => answerIdSet.Contains(m.AIAnswerId)
                && (m.EntityType == MentionEntityType.Brand
                    || m.EntityType == MentionEntityType.Competitor))
            .ToListAsync(cancellationToken);
        var mentionDistribution = await BuildMentionDistributionAsync(
            mentions, tracker.BrandId, request.TrackerId, cancellationToken);
        var competitiveGaps = BuildCompetitiveGaps(mentions, tracker.BrandId, mentionDistribution);
        var recommendationRates = BuildRecommendationRates(mentions, mentionDistribution);

        return new TrackerCompetitiveDto(
            TrackerId: tracker.Id,
            BrandId: tracker.BrandId,
            BrandName: tracker.BrandName,
            Days: days,
            WindowStart: windowStart,
            TopDomains: topDomains,
            DomainTypes: domainTypes,
            MentionDistribution: mentionDistribution,
            CompetitiveGaps: competitiveGaps,
            RecommendationRates: recommendationRates);
    }

    // -----------------------------------------------------------------
    // Top citation domains (D10)
    // -----------------------------------------------------------------

    private async Task<IReadOnlyList<DomainRowDto>> BuildTopDomainsAsync(
        HashSet<Guid> answerIds, Guid brandId, CancellationToken ct)
    {
        // All citation rows in window — pulled as a flat list so the
        // per-source aggregation happens in-memory without N+1 trips.
        var citations = await _db.Citations.AsNoTracking()
            .Where(c => answerIds.Contains(c.AIAnswerId))
            .Select(c => c.SourceId)
            .ToListAsync(ct);
        if (citations.Count == 0) return Array.Empty<DomainRowDto>();

        var totalCitations = citations.Count;

        // Per-source counts. Limit to top-N for the table; the full set is
        // used by BuildDomainTypes for the percentage breakdown.
        var bySource = citations
            .GroupBy(id => id)
            .Select(g => new { SourceId = g.Key, Count = g.Count() })
            .ToList();
        var sourceIds = bySource.Select(s => s.SourceId).ToList();

        var sources = await _db.Sources.AsNoTracking()
            .Where(s => sourceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s, ct);
        var classifications = await _db.BrandSourceClassifications.AsNoTracking()
            .Where(c => c.BrandId == brandId && sourceIds.Contains(c.SourceId))
            .ToDictionaryAsync(c => c.SourceId, c => c.SourceType, ct);

        return bySource
            .Select(g =>
            {
                if (!sources.TryGetValue(g.SourceId, out var source)) return null;
                var type = classifications.TryGetValue(g.SourceId, out var st)
                    ? st : SourceType.Unknown;
                return new DomainRowDto(
                    SourceId: g.SourceId,
                    SourceName: source.SourceName,
                    NormalizedDomain: source.NormalizedDomain,
                    SourceType: type.ToString(),
                    CitationCount: g.Count,
                    CitationRate: (double)g.Count / totalCitations);
            })
            .Where(r => r is not null)
            .Select(r => r!)
            .OrderByDescending(r => r.CitationCount)
            .ThenBy(r => r.SourceName, StringComparer.OrdinalIgnoreCase)
            .Take(TopDomainLimit)
            .ToList();
    }

    // -----------------------------------------------------------------
    // Domain types breakdown (D12)
    // -----------------------------------------------------------------

    /// <summary>
    /// Aggregates citation counts by SourceType across the (top-K-truncated)
    /// domain rows. Note: this uses just the visible top-K rows for v2
    /// simplicity — the percentages refer to "of the top domains shown",
    /// not "of every citation in window". Acceptable trade-off when most
    /// citations cluster in the top-K; can promote to a full-scan
    /// aggregation later if percentages start to look off.
    /// </summary>
    private static IReadOnlyList<DomainTypeShareDto> BuildDomainTypes(
        IReadOnlyList<DomainRowDto> topDomains)
    {
        if (topDomains.Count == 0) return Array.Empty<DomainTypeShareDto>();

        var total = topDomains.Sum(d => d.CitationCount);
        return topDomains
            .GroupBy(d => d.SourceType, StringComparer.Ordinal)
            .Select(g => new DomainTypeShareDto(
                SourceType: g.Key,
                CitationCount: g.Sum(d => d.CitationCount),
                Share: total > 0 ? (double)g.Sum(d => d.CitationCount) / total : 0))
            .OrderByDescending(s => s.CitationCount)
            .ToList();
    }

    // -----------------------------------------------------------------
    // Mention distribution + SoV (D11, D13)
    // -----------------------------------------------------------------

    private async Task<IReadOnlyList<EntityMentionDto>> BuildMentionDistributionAsync(
        IReadOnlyList<Mention> mentions, Guid brandId, Guid trackerId, CancellationToken ct)
    {
        // Tracked entity set — brand + every tracked competitor. Untracked
        // competitor mentions ARE in the data (LLM-named entities the
        // resolver didn't promote to mention_candidates) — but they aren't
        // first-class so they don't get a series. Group them into "Other".
        var brandName = await _db.Brands.AsNoTracking()
            .Where(b => b.Id == brandId).Select(b => b.Name)
            .FirstOrDefaultAsync(ct);
        var trackedCompetitors = await (
            from tc in _db.TrackerCompetitors.AsNoTracking()
            join c in _db.Competitors.AsNoTracking() on tc.CompetitorId equals c.Id
            where tc.TrackerConfigurationId == trackerId
            select new { c.Id, c.Name }
        ).ToListAsync(ct);

        var trackedCompetitorIds = trackedCompetitors.Select(c => c.Id).ToHashSet();
        var competitorNames = trackedCompetitors.ToDictionary(c => c.Id, c => c.Name);

        // Count mentions per tracked entity. Untracked competitor mentions
        // (entity_id not in trackedCompetitorIds) are excluded — they don't
        // belong on a "brand vs tracked competitors" chart.
        int brandCount = mentions.Count(m => m.EntityType == MentionEntityType.Brand && m.EntityId == brandId);
        var competitorCounts = mentions
            .Where(m => m.EntityType == MentionEntityType.Competitor && trackedCompetitorIds.Contains(m.EntityId))
            .GroupBy(m => m.EntityId)
            .ToDictionary(g => g.Key, g => g.Count());

        var totalCount = brandCount + competitorCounts.Values.Sum();
        double Share(int n) => totalCount > 0 ? (double)n / totalCount : 0;

        var result = new List<EntityMentionDto>(1 + trackedCompetitors.Count)
        {
            new(
                EntityType: "Brand",
                EntityId: brandId,
                Name: brandName ?? "Unknown",
                IsTrackedBrand: true,
                MentionCount: brandCount,
                Share: Share(brandCount)),
        };
        foreach (var competitor in trackedCompetitors)
        {
            var count = competitorCounts.TryGetValue(competitor.Id, out var n) ? n : 0;
            result.Add(new EntityMentionDto(
                EntityType: "Competitor",
                EntityId: competitor.Id,
                Name: competitor.Name,
                IsTrackedBrand: false,
                MentionCount: count,
                Share: Share(count)));
        }

        return result
            .OrderByDescending(e => e.IsTrackedBrand)
            .ThenByDescending(e => e.MentionCount)
            .ThenBy(e => e.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    // -----------------------------------------------------------------
    // Competitive gap analysis (D14)
    // -----------------------------------------------------------------

    /// <summary>
    /// Per-pair gap: brand's mention count vs each tracked competitor's,
    /// brand's recommendation count vs each competitor's. Positive gap
    /// means brand is ahead.
    /// </summary>
    private static IReadOnlyList<CompetitiveGapDto> BuildCompetitiveGaps(
        IReadOnlyList<Mention> mentions, Guid brandId,
        IReadOnlyList<EntityMentionDto> mentionDistribution)
    {
        var brandMentions = mentions.Count(m => m.EntityType == MentionEntityType.Brand && m.EntityId == brandId);
        var brandRecs = mentions.Count(m => m.EntityType == MentionEntityType.Brand && m.EntityId == brandId && m.IsRecommended);

        return mentionDistribution
            .Where(e => !e.IsTrackedBrand)
            .Select(competitor =>
            {
                var compMentions = mentions
                    .Where(m => m.EntityType == MentionEntityType.Competitor && m.EntityId == competitor.EntityId)
                    .ToList();
                var compMentionCount = compMentions.Count;
                var compRecs = compMentions.Count(m => m.IsRecommended);
                return new CompetitiveGapDto(
                    CompetitorId: competitor.EntityId,
                    CompetitorName: competitor.Name,
                    BrandMentions: brandMentions,
                    CompetitorMentions: compMentionCount,
                    MentionsGap: brandMentions - compMentionCount,
                    BrandRecommendations: brandRecs,
                    CompetitorRecommendations: compRecs,
                    RecommendationsGap: brandRecs - compRecs);
            })
            .OrderByDescending(g => Math.Abs(g.MentionsGap))
            .ToList();
    }

    // -----------------------------------------------------------------
    // Recommendation rate per entity (D17 — Recommendation Rate by Entity)
    // -----------------------------------------------------------------

    private static IReadOnlyList<EntityRateDto> BuildRecommendationRates(
        IReadOnlyList<Mention> mentions,
        IReadOnlyList<EntityMentionDto> mentionDistribution)
    {
        return mentionDistribution
            .Select(entity =>
            {
                var entityType = entity.IsTrackedBrand ? MentionEntityType.Brand : MentionEntityType.Competitor;
                var entityMentions = mentions
                    .Where(m => m.EntityType == entityType && m.EntityId == entity.EntityId)
                    .ToList();
                var recCount = entityMentions.Count(m => m.IsRecommended);
                double? rate = entityMentions.Count > 0
                    ? (double)recCount / entityMentions.Count
                    : (double?)null;
                return new EntityRateDto(
                    EntityType: entity.EntityType,
                    EntityId: entity.EntityId,
                    Name: entity.Name,
                    IsTrackedBrand: entity.IsTrackedBrand,
                    MentionCount: entityMentions.Count,
                    RecommendationRate: rate);
            })
            .OrderByDescending(e => e.IsTrackedBrand)
            .ThenByDescending(e => e.RecommendationRate ?? double.NegativeInfinity)
            .ThenBy(e => e.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
