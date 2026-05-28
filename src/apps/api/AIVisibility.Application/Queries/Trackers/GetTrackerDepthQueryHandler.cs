using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetTrackerDepthQueryHandler
    : IRequestHandler<GetTrackerDepthQuery, TrackerDepthDto?>
{
    private const int DefaultDays = 30;
    private const int MaxDays = 365;
    private const int RecentChatLimit = 10;
    private const int AnswerSnippetMaxLength = 200;
    private const int TopicHeatmapLimit = 12;

    private readonly IAppDbContext _db;

    public GetTrackerDepthQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<TrackerDepthDto?> Handle(
        GetTrackerDepthQuery request, CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => t.Id == request.TrackerId)
            .Select(t => new { t.Id, t.BrandId, BrandName = t.Brand.Name })
            .FirstOrDefaultAsync(cancellationToken);
        if (tracker == null) return null;

        var days = request.Days <= 0 ? DefaultDays : Math.Min(request.Days, MaxDays);
        var windowStart = DateTime.UtcNow.AddDays(-days);

        var scans = await _db.ScanRuns.AsNoTracking()
            .Where(s => s.TrackerConfigurationId == request.TrackerId
                && s.StartedAt >= windowStart)
            .OrderBy(s => s.StartedAt)
            .Select(s => new ScanRow(s.Id, s.StartedAt))
            .ToListAsync(cancellationToken);
        if (scans.Count == 0)
        {
            return EmptyDto(tracker.Id, tracker.BrandId, tracker.BrandName, days, windowStart);
        }
        var scanIds = scans.Select(s => s.Id).ToList();

        // Pull the prompt-run / answer / platform / prompt set once and
        // hand it to each builder. Avoids re-querying for every panel.
        var runs = await (
            from pr in _db.PromptRuns.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on pr.Id equals a.PromptRunId
            join p in _db.Prompts.AsNoTracking() on pr.PromptId equals p.Id
            join plat in _db.AIPlatforms.AsNoTracking() on pr.AIPlatformId equals plat.Id
            join lens in _db.Lenses.AsNoTracking() on p.LensId equals lens.Id
            where scanIds.Contains(pr.ScanRunId)
            select new RunRow(
                pr.ScanRunId,
                pr.Id,
                a.Id,
                a.AnswerText,
                a.CreatedAt,
                pr.AIPlatformId,
                plat.Code,
                plat.Name,
                plat.DisplayOrder,
                p.Id,
                p.PromptText,
                lens.Code,
                lens.Name)
        ).ToListAsync(cancellationToken);
        if (runs.Count == 0)
        {
            return EmptyDto(tracker.Id, tracker.BrandId, tracker.BrandName, days, windowStart);
        }

        var answerIdSet = runs.Select(r => r.AnswerId).ToHashSet();

        // Brand mentions only — sentiment + activity heatmap + per-platform rate
        // all key off the brand. Slice B already does the multi-entity split.
        var brandMentions = await _db.Mentions.AsNoTracking()
            .Where(m => answerIdSet.Contains(m.AIAnswerId)
                && m.EntityType == MentionEntityType.Brand
                && m.EntityId == tracker.BrandId)
            .Select(m => new BrandMentionRow(m.AIAnswerId, m.Sentiment))
            .ToListAsync(cancellationToken);

        // Per-answer mention + citation counts for the Recent Chats card.
        var mentionCountByAnswer = await _db.Mentions.AsNoTracking()
            .Where(m => answerIdSet.Contains(m.AIAnswerId))
            .GroupBy(m => m.AIAnswerId)
            .Select(g => new { AnswerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.AnswerId, g => g.Count, cancellationToken);
        var citationCountByAnswer = await _db.Citations.AsNoTracking()
            .Where(c => answerIdSet.Contains(c.AIAnswerId))
            .GroupBy(c => c.AIAnswerId)
            .Select(g => new { AnswerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.AnswerId, g => g.Count, cancellationToken);

        // Topic heatmap source: prompt → topics (m:n via PromptTopic).
        var promptIds = runs.Select(r => r.PromptId).Distinct().ToList();
        var promptTopics = await (
            from pt in _db.PromptTopics.AsNoTracking()
            join t in _db.Topics.AsNoTracking() on pt.TopicId equals t.Id
            where promptIds.Contains(pt.PromptId)
            select new PromptTopicRow(pt.PromptId, t.Id, t.Name)
        ).ToListAsync(cancellationToken);

        // AnswerSignal brand sentiment for the Recent Chats sentiment chip.
        var brandSentimentByAnswer = await _db.AnswerSignals.AsNoTracking()
            .Where(s => answerIdSet.Contains(s.AIAnswerId))
            .Select(s => new { s.AIAnswerId, s.BrandSentiment })
            .ToDictionaryAsync(s => s.AIAnswerId, s => s.BrandSentiment, cancellationToken);

        var mentionsByPlatform = BuildMentionsByPlatform(runs, brandMentions);
        var sentimentDistribution = BuildSentimentDistribution(brandMentions);
        var activityHeatmap = BuildActivityHeatmap(runs, scans, brandMentions);
        var topicHeatmap = BuildTopicHeatmap(runs, promptTopics);
        var recentChats = BuildRecentChats(
            runs, mentionCountByAnswer, citationCountByAnswer, brandSentimentByAnswer);

        return new TrackerDepthDto(
            TrackerId: tracker.Id,
            BrandId: tracker.BrandId,
            BrandName: tracker.BrandName,
            Days: days,
            WindowStart: windowStart,
            MentionsByPlatform: mentionsByPlatform,
            SentimentDistribution: sentimentDistribution,
            ActivityHeatmap: activityHeatmap,
            TopicHeatmap: topicHeatmap,
            RecentChats: recentChats);
    }

    private static TrackerDepthDto EmptyDto(Guid trackerId, Guid brandId, string brandName,
        int days, DateTime windowStart)
        => new(trackerId, brandId, brandName, days, windowStart,
            Array.Empty<PlatformMentionDto>(),
            Array.Empty<SentimentSliceDto>(),
            new HeatmapDto(Array.Empty<string>(), Array.Empty<string>(), Array.Empty<HeatmapCellDto>()),
            new HeatmapDto(Array.Empty<string>(), Array.Empty<string>(), Array.Empty<HeatmapCellDto>()),
            Array.Empty<RecentChatDto>());

    // -----------------------------------------------------------------
    // D19 — Mentions by Platform
    // -----------------------------------------------------------------

    private static IReadOnlyList<PlatformMentionDto> BuildMentionsByPlatform(
        IReadOnlyList<RunRow> runs,
        IReadOnlyList<BrandMentionRow> brandMentions)
    {
        var mentionsByAnswer = brandMentions
            .GroupBy(m => m.AIAnswerId)
            .ToDictionary(g => g.Key, g => g.Count());

        return runs
            .GroupBy(r => new { r.PlatformId, r.PlatformCode, r.PlatformName, r.PlatformDisplayOrder })
            .Select(g =>
            {
                int answerCount = g.Select(r => r.AnswerId).Distinct().Count();
                int brandMentionCount = g
                    .Select(r => r.AnswerId)
                    .Distinct()
                    .Sum(id => mentionsByAnswer.TryGetValue(id, out var n) ? n : 0);
                double? rate = answerCount > 0
                    ? (double)brandMentionCount / answerCount
                    : (double?)null;
                return new PlatformMentionDto(
                    PlatformId: g.Key.PlatformId,
                    PlatformCode: g.Key.PlatformCode,
                    PlatformName: g.Key.PlatformName,
                    AnswerCount: answerCount,
                    BrandMentionCount: brandMentionCount,
                    BrandMentionRate: rate);
            })
            .OrderBy(p => runs.First(r => r.PlatformId == p.PlatformId).PlatformDisplayOrder)
            .ThenBy(p => p.PlatformName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    // -----------------------------------------------------------------
    // D18 — Sentiment distribution
    // -----------------------------------------------------------------

    private static IReadOnlyList<SentimentSliceDto> BuildSentimentDistribution(
        IReadOnlyList<BrandMentionRow> brandMentions)
    {
        if (brandMentions.Count == 0) return Array.Empty<SentimentSliceDto>();

        var sentiments = brandMentions
            .GroupBy(m => m.Sentiment)
            .Select(g => new { Sentiment = g.Key, Count = g.Count() })
            .ToList();
        var total = sentiments.Sum(s => s.Count);

        return sentiments
            .Select(s => new SentimentSliceDto(
                Sentiment: s.Sentiment.ToString(),
                Count: s.Count,
                Share: total > 0 ? (double)s.Count / total : 0))
            .OrderBy(s => SentimentOrder(s.Sentiment))
            .ToList();
    }

    private static int SentimentOrder(string s) => s switch
    {
        "Positive" => 0,
        "Neutral" => 1,
        "Mixed" => 2,
        "Negative" => 3,
        "Unknown" => 4,
        _ => 99,
    };

    // -----------------------------------------------------------------
    // D15 — Activity heatmap (platform × scan-day cells)
    // -----------------------------------------------------------------

    private static HeatmapDto BuildActivityHeatmap(
        IReadOnlyList<RunRow> runs,
        IReadOnlyList<ScanRow> scans,
        IReadOnlyList<BrandMentionRow> brandMentions)
    {
        var mentionAnswerIds = brandMentions
            .Select(m => m.AIAnswerId)
            .ToHashSet();

        var scanLabels = scans
            .Select((s, idx) => new
            {
                s.Id,
                s.StartedAt,
                Label = s.StartedAt.ToString("MMM d"),
                Index = idx,
            })
            .ToList();
        // De-dup labels (multiple scans on the same day get suffixes).
        var labelByScanId = scanLabels
            .GroupBy(s => s.Label)
            .SelectMany(g => g.Count() == 1
                ? g.Select(s => (s.Id, Label: s.Label))
                : g.Select((s, n) => (s.Id, Label: $"{s.Label} #{n + 1}")))
            .ToDictionary(t => t.Id, t => t.Label);

        var platforms = runs
            .GroupBy(r => new { r.PlatformId, r.PlatformCode, r.PlatformName, r.PlatformDisplayOrder })
            .OrderBy(g => g.Key.PlatformDisplayOrder)
            .ThenBy(g => g.Key.PlatformName, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.Key.PlatformName)
            .ToList();
        var columns = scans
            .Select(s => labelByScanId[s.Id])
            .ToList();

        var cells = new List<HeatmapCellDto>(platforms.Count * columns.Count);
        foreach (var platformGroup in runs.GroupBy(r => new { r.PlatformId, r.PlatformName }))
        {
            foreach (var scanGroup in platformGroup.GroupBy(r => r.ScanRunId))
            {
                if (!labelByScanId.TryGetValue(scanGroup.Key, out var col)) continue;
                int count = scanGroup
                    .Select(r => r.AnswerId)
                    .Distinct()
                    .Count(id => mentionAnswerIds.Contains(id));
                cells.Add(new HeatmapCellDto(
                    Row: platformGroup.Key.PlatformName,
                    Column: col,
                    Value: count));
            }
        }

        return new HeatmapDto(
            Rows: platforms,
            Columns: columns,
            Cells: cells);
    }

    // -----------------------------------------------------------------
    // D16 — Topic Coverage heatmap (topic × platform answer counts)
    // -----------------------------------------------------------------

    private static HeatmapDto BuildTopicHeatmap(
        IReadOnlyList<RunRow> runs,
        IReadOnlyList<PromptTopicRow> promptTopics)
    {
        var topicsByPrompt = promptTopics
            .GroupBy(pt => pt.PromptId)
            .ToDictionary(g => g.Key, g => g
                .Select(pt => (Id: pt.TopicId, Name: pt.TopicName))
                .ToList());

        // Build (topicName, platformName) -> answer count.
        var counts = new Dictionary<(string Topic, string Platform), int>();
        foreach (var run in runs)
        {
            if (!topicsByPrompt.TryGetValue(run.PromptId, out var topics)) continue;
            foreach (var topic in topics)
            {
                var key = (topic.Name, run.PlatformName);
                counts.TryGetValue(key, out var cur);
                counts[key] = cur + 1;
            }
        }
        if (counts.Count == 0)
        {
            return new HeatmapDto(Array.Empty<string>(), Array.Empty<string>(), Array.Empty<HeatmapCellDto>());
        }

        // Rows: top N topics by total answer count desc (cap at TopicHeatmapLimit).
        var topicTotals = counts
            .GroupBy(kvp => kvp.Key.Topic)
            .Select(g => new { Topic = g.Key, Total = g.Sum(kvp => kvp.Value) })
            .OrderByDescending(t => t.Total)
            .ThenBy(t => t.Topic, StringComparer.OrdinalIgnoreCase)
            .Take(TopicHeatmapLimit)
            .ToList();
        var topicRows = topicTotals.Select(t => t.Topic).ToList();
        var topicRowSet = topicRows.ToHashSet();

        // Columns: platforms in their display-order from runs.
        var platformCols = runs
            .GroupBy(r => new { r.PlatformId, r.PlatformName, r.PlatformDisplayOrder })
            .OrderBy(g => g.Key.PlatformDisplayOrder)
            .ThenBy(g => g.Key.PlatformName, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.Key.PlatformName)
            .ToList();

        var cells = counts
            .Where(kvp => topicRowSet.Contains(kvp.Key.Topic))
            .Select(kvp => new HeatmapCellDto(
                Row: kvp.Key.Topic,
                Column: kvp.Key.Platform,
                Value: kvp.Value))
            .ToList();

        return new HeatmapDto(
            Rows: topicRows,
            Columns: platformCols,
            Cells: cells);
    }

    // -----------------------------------------------------------------
    // D17 — Recent Chats projection
    // -----------------------------------------------------------------

    private static IReadOnlyList<RecentChatDto> BuildRecentChats(
        IReadOnlyList<RunRow> runs,
        IReadOnlyDictionary<Guid, int> mentionCountByAnswer,
        IReadOnlyDictionary<Guid, int> citationCountByAnswer,
        IReadOnlyDictionary<Guid, Sentiment> brandSentimentByAnswer)
    {
        return runs
            .OrderByDescending(r => r.AnswerCreatedAt)
            .Take(RecentChatLimit)
            .Select(r => new RecentChatDto(
                AnswerId: r.AnswerId,
                PromptRunId: r.PromptRunId,
                PromptText: r.PromptText,
                PlatformId: r.PlatformId,
                PlatformCode: r.PlatformCode,
                PlatformName: r.PlatformName,
                LensCode: r.LensCode,
                LensName: r.LensName,
                AnswerSnippet: Truncate(r.AnswerText, AnswerSnippetMaxLength),
                CapturedAt: r.AnswerCreatedAt,
                MentionCount: mentionCountByAnswer.TryGetValue(r.AnswerId, out var mc) ? mc : 0,
                CitationCount: citationCountByAnswer.TryGetValue(r.AnswerId, out var cc) ? cc : 0,
                BrandSentiment: brandSentimentByAnswer.TryGetValue(r.AnswerId, out var sent)
                    ? sent.ToString() : null))
            .ToList();
    }

    private static string Truncate(string s, int max)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        s = s.Trim();
        return s.Length <= max ? s : s.Substring(0, max).TrimEnd() + "…";
    }

    // Internal projection records for the joined query sets — keeps the
    // builder signatures small and the LINQ projection EF-translatable.
    private sealed record RunRow(
        Guid ScanRunId,
        Guid PromptRunId,
        Guid AnswerId,
        string AnswerText,
        DateTime AnswerCreatedAt,
        Guid PlatformId,
        string PlatformCode,
        string PlatformName,
        int PlatformDisplayOrder,
        Guid PromptId,
        string PromptText,
        string LensCode,
        string LensName);

    private sealed record ScanRow(Guid Id, DateTime StartedAt);

    private sealed record BrandMentionRow(Guid AIAnswerId, Sentiment Sentiment);

    private sealed record PromptTopicRow(Guid PromptId, Guid TopicId, string TopicName);
}
