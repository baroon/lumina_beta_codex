using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Competitors;

public class GetScanCompetitorQueryHandler : IRequestHandler<GetScanCompetitorQuery, ScanCompetitorDetailDto?>
{
    private const int TopSourceLimit = 20;

    private readonly IAppDbContext _db;

    public GetScanCompetitorQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanCompetitorDetailDto?> Handle(
        GetScanCompetitorQuery request, CancellationToken cancellationToken)
    {
        var scanExists = await _db.ScanRuns.AsNoTracking()
            .AnyAsync(s => s.Id == request.ScanRunId, cancellationToken);
        if (!scanExists) return null;

        var competitor = await _db.Competitors.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.CompetitorId, cancellationToken);
        if (competitor == null) return null;

        // Competitor-scope metrics for this competitor (MentionCount,
        // RecommendationCount).
        var metricRows = await _db.ScanMetrics.AsNoTracking()
            .Where(m => m.ScanRunId == request.ScanRunId
                && m.Scope == ScanMetricScope.Competitor
                && m.ScopeId == request.CompetitorId)
            .ToListAsync(cancellationToken);

        int IntOrZero(string name) =>
            (int)(metricRows.FirstOrDefault(r => r.MetricName == name)?.MetricValue ?? 0);

        var mentionCount = IntOrZero(MetricNames.MentionCount);
        var recCount = IntOrZero(MetricNames.RecommendationCount);

        // Total answer count → MentionRate denominator. Same definition as
        // the list handler: answers with a signal row (the D3 catch-and-
        // continue path excludes bad-JSON answers).
        var answerCount = await (
            from a in _db.AIAnswers.AsNoTracking()
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.AnswerSignals.AsNoTracking() on a.Id equals s.AIAnswerId
            where pr.ScanRunId == request.ScanRunId
            select a.Id
        ).CountAsync(cancellationToken);

        double? mentionRate = answerCount > 0 ? (double)mentionCount / answerCount : null;
        double? recRate = mentionCount > 0 ? (double)recCount / mentionCount : null;

        var metrics = new CompetitorMetricsDto(
            MentionCount: mentionCount,
            RecommendationCount: recCount,
            MentionRate: mentionRate,
            RecommendationRate: recRate);

        var sources = await BuildSourcesMentioningCompetitor(request, cancellationToken);

        return new ScanCompetitorDetailDto(
            ScanRunId: request.ScanRunId,
            CompetitorId: competitor.Id,
            Name: competitor.Name,
            Domain: competitor.Domain,
            Metrics: metrics,
            SourcesMentioningCompetitor: sources);
    }

    /// <summary>
    /// Find every answer in this scan that mentioned the competitor, then
    /// every citation on those answers, then dedup + count by source. The
    /// "sources that mentioned them" surface from plan §D17.
    /// </summary>
    private async Task<IReadOnlyList<CompetitorMentionSourceDto>> BuildSourcesMentioningCompetitor(
        GetScanCompetitorQuery request, CancellationToken ct)
    {
        // 1. Answer IDs in this scan that mentioned this competitor.
        var competitorAnswerIds = await (
            from m in _db.Mentions.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            where pr.ScanRunId == request.ScanRunId
                && m.EntityType == MentionEntityType.Competitor
                && m.EntityId == request.CompetitorId
            select a.Id
        ).Distinct().ToListAsync(ct);

        if (competitorAnswerIds.Count == 0)
        {
            return Array.Empty<CompetitorMentionSourceDto>();
        }

        // 2. Citation rows on those answers + source lookup.
        var citations = await _db.Citations.AsNoTracking()
            .Where(c => competitorAnswerIds.Contains(c.AIAnswerId))
            .Select(c => c.SourceId)
            .ToListAsync(ct);
        if (citations.Count == 0)
        {
            return Array.Empty<CompetitorMentionSourceDto>();
        }

        var sourceIds = citations.Distinct().ToList();
        var sources = await _db.Sources.AsNoTracking()
            .Where(s => sourceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s, ct);

        // 3. Group by source, count, top-K by count.
        return citations
            .GroupBy(sourceId => sourceId)
            .Select(g =>
            {
                if (!sources.TryGetValue(g.Key, out var source)) return null;
                return new CompetitorMentionSourceDto(
                    SourceId: g.Key,
                    SourceName: source.SourceName,
                    NormalizedDomain: source.NormalizedDomain,
                    CitationCount: g.Count());
            })
            .Where(s => s is not null)
            .Select(s => s!)
            .OrderByDescending(s => s.CitationCount)
            .ThenBy(s => s.SourceName, StringComparer.OrdinalIgnoreCase)
            .Take(TopSourceLimit)
            .ToList();
    }
}
