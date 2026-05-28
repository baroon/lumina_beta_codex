using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetWorkspaceCompetitiveQueryHandler
    : IRequestHandler<GetWorkspaceCompetitiveQuery, WorkspaceCompetitiveDto>
{
    private const int DefaultDays = 30;
    private const int MaxDays = 365;
    private const int TopDomainLimit = 10;

    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetWorkspaceCompetitiveQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<WorkspaceCompetitiveDto> Handle(
        GetWorkspaceCompetitiveQuery request, CancellationToken cancellationToken)
    {
        var days = request.Days <= 0 ? DefaultDays : Math.Min(request.Days, MaxDays);
        var windowStart = DateTime.UtcNow.AddDays(-days);
        var workspaceId = _workspace.WorkspaceId;

        // Resolve workspace scope: tracked brands + trackers + per-brand
        // tracker membership (needed for per-brand gap groups).
        var brands = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => new BrandRow(b.Id, b.Name))
            .ToListAsync(cancellationToken);
        var brandIds = brands.Select(b => b.Id).ToHashSet();

        var trackers = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => new TrackerRow(t.Id, t.BrandId))
            .ToListAsync(cancellationToken);
        var trackerIds = trackers.Select(t => t.Id).ToList();
        var trackersByBrand = trackers
            .GroupBy(t => t.BrandId)
            .ToDictionary(g => g.Key, g => g.Select(t => t.Id).ToHashSet());

        if (trackerIds.Count == 0)
        {
            return Empty(workspaceId, days, windowStart);
        }

        // Answers in window across all trackers — joined with AnswerSignal so
        // we only include answers the signal extractor produced output for
        // (mirrors v2 + Slice C handler).
        var answerRows = await (
            from a in _db.AIAnswers.AsNoTracking()
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join sig in _db.AnswerSignals.AsNoTracking() on a.Id equals sig.AIAnswerId
            where trackerIds.Contains(s.TrackerConfigurationId) && s.StartedAt >= windowStart
            select new AnswerRow(a.Id, s.TrackerConfigurationId)
        ).ToListAsync(cancellationToken);

        if (answerRows.Count == 0)
        {
            return Empty(workspaceId, days, windowStart);
        }

        var allAnswerIds = answerRows.Select(a => a.AnswerId).ToHashSet();

        // Top domains + domain types operate on every citation in the
        // workspace's answer set.
        var topDomains = await BuildTopDomainsAsync(allAnswerIds, cancellationToken);
        var domainTypes = BuildDomainTypes(topDomains);

        // Pull all (brand + competitor) mentions across the workspace once;
        // every downstream builder filters from this list.
        var mentions = await _db.Mentions.AsNoTracking()
            .Where(m => allAnswerIds.Contains(m.AIAnswerId)
                && (m.EntityType == MentionEntityType.Brand
                    || m.EntityType == MentionEntityType.Competitor))
            .ToListAsync(cancellationToken);

        // Resolve tracked competitor id set (de-duped by Competitor.Id) +
        // names. v2 uses TrackerCompetitor; we do the same but flatten across
        // workspace.
        var trackedCompetitors = await (
            from tc in _db.TrackerCompetitors.AsNoTracking()
            join c in _db.Competitors.AsNoTracking() on tc.CompetitorId equals c.Id
            where trackerIds.Contains(tc.TrackerConfigurationId)
            select new { c.Id, c.Name }
        ).ToListAsync(cancellationToken);
        var competitorNames = trackedCompetitors
            .GroupBy(c => c.Id)
            .ToDictionary(g => g.Key, g => g.First().Name);
        var trackedCompetitorIds = competitorNames.Keys.ToHashSet();

        var mentionDistribution = BuildMentionDistribution(
            mentions, brandIds, trackedCompetitorIds, brands, competitorNames);
        var competitiveGaps = BuildCompetitiveGapGroups(
            mentions, answerRows, brands, trackersByBrand,
            trackedCompetitorIds, competitorNames);
        var recommendationRates = BuildRecommendationRates(mentions, mentionDistribution);

        return new WorkspaceCompetitiveDto(
            WorkspaceId: workspaceId,
            Days: days,
            WindowStart: windowStart,
            TopDomains: topDomains,
            DomainTypes: domainTypes,
            MentionDistribution: mentionDistribution,
            CompetitiveGaps: competitiveGaps,
            RecommendationRates: recommendationRates);
    }

    private static WorkspaceCompetitiveDto Empty(Guid workspaceId, int days, DateTime windowStart) =>
        new(workspaceId, days, windowStart,
            Array.Empty<DomainRowDto>(),
            Array.Empty<DomainTypeShareDto>(),
            Array.Empty<EntityMentionDto>(),
            Array.Empty<BrandCompetitiveGapGroupDto>(),
            Array.Empty<EntityRateDto>());

    // -----------------------------------------------------------------
    // Top citation domains (workspace-wide)
    // -----------------------------------------------------------------

    private async Task<IReadOnlyList<DomainRowDto>> BuildTopDomainsAsync(
        HashSet<Guid> answerIds, CancellationToken ct)
    {
        var citations = await _db.Citations.AsNoTracking()
            .Where(c => answerIds.Contains(c.AIAnswerId))
            .Select(c => c.SourceId)
            .ToListAsync(ct);
        if (citations.Count == 0) return Array.Empty<DomainRowDto>();

        var totalCitations = citations.Count;

        var bySource = citations
            .GroupBy(id => id)
            .Select(g => new { SourceId = g.Key, Count = g.Count() })
            .ToList();
        var sourceIds = bySource.Select(s => s.SourceId).ToList();

        var sources = await _db.Sources.AsNoTracking()
            .Where(s => sourceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s, ct);

        // Workspace-wide classifications — a source may have multiple
        // brand-scoped classifications; pick the highest-confidence active
        // one for the chip. Cross-workspace this is a useful approximation.
        var classifications = await _db.BrandSourceClassifications.AsNoTracking()
            .Where(c => sourceIds.Contains(c.SourceId) && c.Status == ClassificationStatus.Active)
            .ToListAsync(ct);
        var typeBySource = classifications
            .GroupBy(c => c.SourceId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(c => c.ConfidenceScore).First().SourceType);

        return bySource
            .Select(g =>
            {
                if (!sources.TryGetValue(g.SourceId, out var source)) return null;
                var type = typeBySource.TryGetValue(g.SourceId, out var st) ? st : SourceType.Unknown;
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
    // Mention distribution (workspace-wide)
    // -----------------------------------------------------------------

    private static IReadOnlyList<EntityMentionDto> BuildMentionDistribution(
        IReadOnlyList<Mention> mentions,
        HashSet<Guid> brandIds,
        HashSet<Guid> trackedCompetitorIds,
        IReadOnlyList<BrandRow> brands,
        IReadOnlyDictionary<Guid, string> competitorNames)
    {
        var brandCounts = mentions
            .Where(m => m.EntityType == MentionEntityType.Brand && brandIds.Contains(m.EntityId))
            .GroupBy(m => m.EntityId)
            .ToDictionary(g => g.Key, g => g.Count());
        var competitorCounts = mentions
            .Where(m => m.EntityType == MentionEntityType.Competitor && trackedCompetitorIds.Contains(m.EntityId))
            .GroupBy(m => m.EntityId)
            .ToDictionary(g => g.Key, g => g.Count());

        var totalCount = brandCounts.Values.Sum() + competitorCounts.Values.Sum();
        double Share(int n) => totalCount > 0 ? (double)n / totalCount : 0;

        var rows = new List<EntityMentionDto>();
        foreach (var brand in brands)
        {
            int count = brandCounts.TryGetValue(brand.Id, out var n) ? n : 0;
            rows.Add(new EntityMentionDto(
                EntityType: "Brand",
                EntityId: brand.Id,
                Name: brand.Name,
                IsTrackedBrand: true,
                MentionCount: count,
                Share: Share(count)));
        }
        foreach (var (id, name) in competitorNames)
        {
            int count = competitorCounts.TryGetValue(id, out var n) ? n : 0;
            rows.Add(new EntityMentionDto(
                EntityType: "Competitor",
                EntityId: id,
                Name: name,
                IsTrackedBrand: false,
                MentionCount: count,
                Share: Share(count)));
        }

        return rows
            .OrderByDescending(e => e.IsTrackedBrand)
            .ThenBy(e => e.IsTrackedBrand ? e.Name : string.Empty, StringComparer.OrdinalIgnoreCase)
            .ThenByDescending(e => e.IsTrackedBrand ? 0 : e.MentionCount)
            .ThenBy(e => e.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    // -----------------------------------------------------------------
    // Per-tracked-brand competitive gap groups (D15)
    // -----------------------------------------------------------------

    private static IReadOnlyList<BrandCompetitiveGapGroupDto> BuildCompetitiveGapGroups(
        IReadOnlyList<Mention> mentions,
        IReadOnlyList<AnswerRow> answerRows,
        IReadOnlyList<BrandRow> brands,
        IReadOnlyDictionary<Guid, HashSet<Guid>> trackersByBrand,
        HashSet<Guid> trackedCompetitorIds,
        IReadOnlyDictionary<Guid, string> competitorNames)
    {
        // Build answer-id → trackerId map once.
        var trackerByAnswer = answerRows.ToDictionary(r => r.AnswerId, r => r.TrackerId);

        var groups = new List<BrandCompetitiveGapGroupDto>();
        foreach (var brand in brands)
        {
            if (!trackersByBrand.TryGetValue(brand.Id, out var brandTrackerIds) || brandTrackerIds.Count == 0)
            {
                continue;
            }

            // Mentions on answers produced by THIS brand's trackers — gap
            // math requires a shared scan set per the v3 plan §D15.
            var brandScopedMentions = mentions
                .Where(m => trackerByAnswer.TryGetValue(m.AIAnswerId, out var t)
                    && brandTrackerIds.Contains(t))
                .ToList();

            int brandMentionCount = brandScopedMentions.Count(m =>
                m.EntityType == MentionEntityType.Brand && m.EntityId == brand.Id);
            int brandRecCount = brandScopedMentions.Count(m =>
                m.EntityType == MentionEntityType.Brand && m.EntityId == brand.Id && m.IsRecommended);

            var competitorIdsForBrand = brandScopedMentions
                .Where(m => m.EntityType == MentionEntityType.Competitor && trackedCompetitorIds.Contains(m.EntityId))
                .Select(m => m.EntityId)
                .Distinct()
                .ToList();

            var gaps = competitorIdsForBrand
                .Select(competitorId =>
                {
                    var compMentions = brandScopedMentions
                        .Where(m => m.EntityType == MentionEntityType.Competitor && m.EntityId == competitorId)
                        .ToList();
                    var compMentionCount = compMentions.Count;
                    var compRecCount = compMentions.Count(m => m.IsRecommended);
                    return new CompetitiveGapDto(
                        CompetitorId: competitorId,
                        CompetitorName: competitorNames.TryGetValue(competitorId, out var n) ? n : "Unknown",
                        BrandMentions: brandMentionCount,
                        CompetitorMentions: compMentionCount,
                        MentionsGap: brandMentionCount - compMentionCount,
                        BrandRecommendations: brandRecCount,
                        CompetitorRecommendations: compRecCount,
                        RecommendationsGap: brandRecCount - compRecCount);
                })
                .OrderByDescending(g => Math.Abs(g.MentionsGap))
                .ThenBy(g => g.CompetitorName, StringComparer.OrdinalIgnoreCase)
                .ToList();

            groups.Add(new BrandCompetitiveGapGroupDto(brand.Id, brand.Name, gaps));
        }

        return groups
            .OrderBy(g => g.TrackedBrandName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    // -----------------------------------------------------------------
    // Recommendation rate per entity (workspace-wide)
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
            .ThenBy(e => e.IsTrackedBrand ? e.Name : string.Empty, StringComparer.OrdinalIgnoreCase)
            .ThenByDescending(e => e.IsTrackedBrand ? 0 : (e.RecommendationRate ?? double.NegativeInfinity))
            .ThenBy(e => e.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private sealed record AnswerRow(Guid AnswerId, Guid TrackerId);
    private sealed record BrandRow(Guid Id, string Name);
    private sealed record TrackerRow(Guid Id, Guid BrandId);
}
