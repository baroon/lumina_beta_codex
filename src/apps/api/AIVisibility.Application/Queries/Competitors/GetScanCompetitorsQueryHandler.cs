using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Competitors;

public class GetScanCompetitorsQueryHandler : IRequestHandler<GetScanCompetitorsQuery, ScanCompetitorsDto?>
{
    private readonly IAppDbContext _db;

    public GetScanCompetitorsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanCompetitorsDto?> Handle(GetScanCompetitorsQuery request, CancellationToken cancellationToken)
    {
        var scanExists = await _db.ScanRuns.AsNoTracking()
            .AnyAsync(s => s.Id == request.ScanRunId, cancellationToken);
        if (!scanExists) return null;

        var competitorMetrics = await _db.ScanMetrics.AsNoTracking()
            .Where(m => m.ScanRunId == request.ScanRunId && m.Scope == ScanMetricScope.Competitor)
            .ToListAsync(cancellationToken);

        if (competitorMetrics.Count == 0)
        {
            return new ScanCompetitorsDto(request.ScanRunId, Array.Empty<CompetitorListItemDto>());
        }

        // Total answer count for the scan, used as MentionRate denominator.
        // Only answers with an AnswerSignal count — those are the ones that
        // could have produced a mention. Skips bad-JSON answers (D3 catch).
        var answerCount = await (
            from a in _db.AIAnswers.AsNoTracking()
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.AnswerSignals.AsNoTracking() on a.Id equals s.AIAnswerId
            where pr.ScanRunId == request.ScanRunId
            select a.Id
        ).CountAsync(cancellationToken);

        var competitorIds = competitorMetrics
            .Where(m => m.ScopeId.HasValue)
            .Select(m => m.ScopeId!.Value)
            .Distinct()
            .ToList();

        var competitors = await _db.Competitors.AsNoTracking()
            .Where(c => competitorIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c, cancellationToken);

        var rows = competitorMetrics
            .Where(m => m.ScopeId.HasValue)
            .GroupBy(m => m.ScopeId!.Value)
            .Select(g => BuildRow(g.Key, g.ToList(), competitors, answerCount))
            .Where(r => r is not null)
            .Select(r => r!)
            // Sort by mention count desc, then name asc — most-mentioned
            // competitors are the most useful to surface first.
            .OrderByDescending(r => r.MentionCount)
            .ThenBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new ScanCompetitorsDto(request.ScanRunId, rows);
    }

    private static CompetitorListItemDto? BuildRow(
        Guid competitorId,
        List<ScanMetric> rows,
        IReadOnlyDictionary<Guid, Competitor> competitors,
        int answerCount)
    {
        if (!competitors.TryGetValue(competitorId, out var competitor)) return null;

        int IntOrZero(string name) => (int)(rows.FirstOrDefault(r => r.MetricName == name)?.MetricValue ?? 0);

        var mentionCount = IntOrZero(MetricNames.MentionCount);
        var recCount = IntOrZero(MetricNames.RecommendationCount);

        double? mentionRate = answerCount > 0 ? (double)mentionCount / answerCount : null;
        double? recRate = mentionCount > 0 ? (double)recCount / mentionCount : null;

        return new CompetitorListItemDto(
            CompetitorId: competitorId,
            Name: competitor.Name,
            Domain: competitor.Domain,
            MentionCount: mentionCount,
            RecommendationCount: recCount,
            MentionRate: mentionRate,
            RecommendationRate: recRate);
    }
}
