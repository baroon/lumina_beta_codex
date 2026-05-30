using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Scans;

public class GetLatestScanQueryHandler : IRequestHandler<GetLatestScanQuery, ScanStatusDto?>
{
    private readonly IAppDbContext _db;

    public GetLatestScanQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanStatusDto?> Handle(GetLatestScanQuery request, CancellationToken cancellationToken)
    {
        var run = await _db.ScanRuns
            .Where(r => r.TrackerConfigurationId == request.TrackerId)
            .OrderByDescending(r => r.StartedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (run == null) return null;

        // Brand name for the scan-progress title. Joined off the run's tracker
        // so the FE can render 'Checking ... for {brand}…' without an extra
        // round-trip. Empty string when the tracker or brand is somehow gone
        // (shouldn't happen with FK constraints, but treat it as missing).
        var brandName = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => t.Id == run.TrackerConfigurationId)
            .Select(t => t.Brand!.Name)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        // Aggregate prompt-run progress overall and per platform.
        var progressRows = await _db.PromptRuns.AsNoTracking()
            .Where(p => p.ScanRunId == run.Id)
            .GroupBy(p => new { p.AIPlatformId, p.Status })
            .Select(g => new { g.Key.AIPlatformId, g.Key.Status, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var completedTotal = progressRows
            .Where(r => r.Status == PromptRunStatus.Completed).Sum(r => r.Count);
        var failedTotal = progressRows
            .Where(r => r.Status == PromptRunStatus.Failed).Sum(r => r.Count);

        var platformIds = progressRows.Select(r => r.AIPlatformId).Distinct().ToList();
        var platformLookup = await _db.AIPlatforms.AsNoTracking()
            .Where(p => platformIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Code, p.Name })
            .ToListAsync(cancellationToken);

        var platforms = platformLookup
            .Select(p =>
            {
                var rows = progressRows.Where(r => r.AIPlatformId == p.Id).ToList();
                var done = rows.Where(r => r.Status == PromptRunStatus.Completed).Sum(r => r.Count);
                var fail = rows.Where(r => r.Status == PromptRunStatus.Failed).Sum(r => r.Count);
                var total = rows.Sum(r => r.Count);
                var status = DerivePlatformStatus(done, fail, total);
                return new ScanPlatformProgressDto(p.Id, p.Code, p.Name, done, fail, total, status);
            })
            .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Live counters joined to this scan's prompt-runs via AIAnswer. Empty
        // when the scan is brand-new (no answers landed yet) — that's a real
        // zero, not a missing value.
        var answerIds = await _db.AIAnswers.AsNoTracking()
            .Where(a => _db.PromptRuns.Any(pr => pr.Id == a.PromptRunId && pr.ScanRunId == run.Id))
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        var mentionRows = await _db.Mentions.AsNoTracking()
            .Where(m => answerIds.Contains(m.AIAnswerId))
            .Select(m => new { m.IsRecommended, m.Sentiment })
            .ToListAsync(cancellationToken);

        var citations = await _db.Citations.AsNoTracking()
            .CountAsync(c => answerIds.Contains(c.AIAnswerId), cancellationToken);

        var sentiment = new SentimentDistributionDto(
            Positive: mentionRows.Count(m => m.Sentiment == Sentiment.Positive),
            Neutral: mentionRows.Count(m => m.Sentiment == Sentiment.Neutral),
            Negative: mentionRows.Count(m => m.Sentiment == Sentiment.Negative),
            Mixed: mentionRows.Count(m => m.Sentiment == Sentiment.Mixed),
            Unknown: mentionRows.Count(m => m.Sentiment == Sentiment.Unknown));

        var liveCounters = new LiveCountersDto(
            Mentions: mentionRows.Count,
            Citations: citations,
            Recommended: mentionRows.Count(m => m.IsRecommended),
            Sentiment: sentiment);

        return new ScanStatusDto(
            run.Id,
            run.Status.ToString(),
            run.TriggerType.ToString(),
            run.ScanCheckCount,
            completedTotal,
            failedTotal,
            run.StartedAt,
            run.CompletedAt,
            brandName,
            platforms,
            liveCounters);
    }

    private static string DerivePlatformStatus(int completed, int failed, int total)
    {
        if (total == 0) return "Pending";
        var done = completed + failed;
        if (done == 0) return "Pending";
        if (done < total) return "Running";
        if (failed == total) return "Failed";
        return "Done";
    }
}
