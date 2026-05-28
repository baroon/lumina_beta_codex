using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Overview;

public class GetWorkspaceDepthQueryHandler
    : IRequestHandler<GetWorkspaceDepthQuery, WorkspaceDepthDto>
{
    private const int DefaultDays = 30;
    private const int MaxDays = 365;
    private const int ActivityHeatmapMaxDays = 90;
    private const int RecentChatLimit = 10;
    private const int AnswerSnippetMaxLength = 200;
    private const int TopicHeatmapLimit = 12;

    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetWorkspaceDepthQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<WorkspaceDepthDto> Handle(
        GetWorkspaceDepthQuery request, CancellationToken cancellationToken)
    {
        var days = request.Days <= 0 ? DefaultDays : Math.Min(request.Days, MaxDays);
        var windowStart = DateTime.UtcNow.AddDays(-days);
        var workspaceId = _workspace.WorkspaceId;

        // Workspace scope: tracked brands + trackers.
        var brands = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => new BrandRow(b.Id, b.Name))
            .ToListAsync(cancellationToken);
        var trackedBrandIds = brands.Select(b => b.Id).ToHashSet();
        var brandNameById = brands.ToDictionary(b => b.Id, b => b.Name);

        if (trackedBrandIds.Count == 0)
        {
            return EmptyDto(workspaceId, days, windowStart);
        }

        var trackers = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => trackedBrandIds.Contains(t.BrandId))
            .Select(t => new TrackerRow(t.Id, t.BrandId, t.Name))
            .ToListAsync(cancellationToken);
        if (trackers.Count == 0)
        {
            return EmptyDto(workspaceId, days, windowStart);
        }
        var trackerIds = trackers.Select(t => t.Id).ToList();
        var trackerById = trackers.ToDictionary(t => t.Id, t => t);

        // Scans across all trackers in window.
        var scans = await _db.ScanRuns.AsNoTracking()
            .Where(s => trackerIds.Contains(s.TrackerConfigurationId)
                && s.StartedAt >= windowStart)
            .OrderBy(s => s.StartedAt)
            .Select(s => new ScanRow(s.Id, s.StartedAt, s.TrackerConfigurationId))
            .ToListAsync(cancellationToken);
        if (scans.Count == 0)
        {
            return EmptyDto(workspaceId, days, windowStart);
        }

        // Runs/answers across the workspace — one pass.
        var scanIds = scans.Select(s => s.Id).ToList();
        var runs = await (
            from pr in _db.PromptRuns.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on pr.Id equals a.PromptRunId
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join p in _db.Prompts.AsNoTracking() on pr.PromptId equals p.Id
            join plat in _db.AIPlatforms.AsNoTracking() on pr.AIPlatformId equals plat.Id
            join lens in _db.Lenses.AsNoTracking() on p.LensId equals lens.Id
            where scanIds.Contains(pr.ScanRunId)
            select new RunRow(
                s.Id,
                s.TrackerConfigurationId,
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
            return EmptyDto(workspaceId, days, windowStart);
        }

        var answerIdSet = runs.Select(r => r.AnswerId).ToHashSet();

        // Brand mentions — any tracked brand counts (multi-brand workspace).
        var brandMentions = await _db.Mentions.AsNoTracking()
            .Where(m => answerIdSet.Contains(m.AIAnswerId)
                && m.EntityType == MentionEntityType.Brand
                && trackedBrandIds.Contains(m.EntityId))
            .Select(m => new BrandMentionRow(m.AIAnswerId, m.Sentiment))
            .ToListAsync(cancellationToken);

        // Per-answer mention + citation counts for Recent Chats.
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

        // Topic heatmap source — prompt → topics, grouped by topic NAME for
        // cross-brand equivalence per the v3 plan §D17.
        var promptIds = runs.Select(r => r.PromptId).Distinct().ToList();
        var promptTopics = await (
            from pt in _db.PromptTopics.AsNoTracking()
            join t in _db.Topics.AsNoTracking() on pt.TopicId equals t.Id
            where promptIds.Contains(pt.PromptId)
            select new PromptTopicRow(pt.PromptId, t.Name)
        ).ToListAsync(cancellationToken);

        var brandSentimentByAnswer = await _db.AnswerSignals.AsNoTracking()
            .Where(s => answerIdSet.Contains(s.AIAnswerId))
            .Select(s => new { s.AIAnswerId, s.BrandSentiment })
            .ToDictionaryAsync(s => s.AIAnswerId, s => s.BrandSentiment, cancellationToken);

        var mentionsByPlatform = BuildMentionsByPlatform(runs, brandMentions);
        var sentimentDistribution = BuildSentimentDistribution(brandMentions);
        var activityHeatmap = BuildActivityHeatmap(runs, scans, brandMentions, windowStart);
        var topicHeatmap = BuildTopicHeatmap(runs, promptTopics, citationCountByAnswer);
        var recentChats = BuildRecentChats(
            runs, mentionCountByAnswer, citationCountByAnswer, brandSentimentByAnswer,
            trackerById, brandNameById);

        return new WorkspaceDepthDto(
            WorkspaceId: workspaceId,
            Days: days,
            WindowStart: windowStart,
            MentionsByPlatform: mentionsByPlatform,
            SentimentDistribution: sentimentDistribution,
            ActivityHeatmap: activityHeatmap,
            TopicHeatmap: topicHeatmap,
            RecentChats: recentChats);
    }

    private static WorkspaceDepthDto EmptyDto(Guid workspaceId, int days, DateTime windowStart) =>
        new(workspaceId, days, windowStart,
            Array.Empty<PlatformMentionDto>(),
            Array.Empty<SentimentSliceDto>(),
            new HeatmapDto(Array.Empty<string>(), Array.Empty<string>(), Array.Empty<HeatmapCellDto>()),
            new TopicHeatmapDto(Array.Empty<string>(), Array.Empty<string>(), Array.Empty<TopicHeatmapCellDto>()),
            Array.Empty<WorkspaceRecentChatDto>());

    // -----------------------------------------------------------------
    // Mentions by Platform (sums across trackers)
    // -----------------------------------------------------------------

    private static IReadOnlyList<PlatformMentionDto> BuildMentionsByPlatform(
        IReadOnlyList<RunRow> runs, IReadOnlyList<BrandMentionRow> brandMentions)
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
    // Sentiment distribution
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
    // Activity heatmap — platform rows × scan-day cols across workspace
    // Hard-capped at 90 days regardless of `days` per v3 plan §D32.
    // -----------------------------------------------------------------

    private static HeatmapDto BuildActivityHeatmap(
        IReadOnlyList<RunRow> runs,
        IReadOnlyList<ScanRow> scans,
        IReadOnlyList<BrandMentionRow> brandMentions,
        DateTime windowStart)
    {
        var heatmapWindowStart = DateTime.UtcNow.AddDays(-ActivityHeatmapMaxDays);
        if (heatmapWindowStart < windowStart) heatmapWindowStart = windowStart;

        var visibleScans = scans
            .Where(s => s.StartedAt >= heatmapWindowStart)
            .OrderBy(s => s.StartedAt)
            .ToList();
        if (visibleScans.Count == 0)
        {
            return new HeatmapDto(Array.Empty<string>(), Array.Empty<string>(), Array.Empty<HeatmapCellDto>());
        }

        var visibleScanIds = visibleScans.Select(s => s.Id).ToHashSet();
        var visibleRuns = runs.Where(r => visibleScanIds.Contains(r.ScanRunId)).ToList();
        var mentionAnswerIds = brandMentions.Select(m => m.AIAnswerId).ToHashSet();

        // Column labels by scan-day — multiple scans on the same day are
        // suffixed (#1, #2…) so each scan still gets its own column.
        var rawLabels = visibleScans
            .Select((s, i) => new { s.Id, s.StartedAt, Label = s.StartedAt.ToString("MMM d"), Index = i })
            .ToList();
        var labelByScanId = rawLabels
            .GroupBy(s => s.Label)
            .SelectMany(g => g.Count() == 1
                ? g.Select(s => (s.Id, Label: s.Label))
                : g.Select((s, n) => (s.Id, Label: $"{s.Label} #{n + 1}")))
            .ToDictionary(t => t.Id, t => t.Label);

        var platforms = visibleRuns
            .GroupBy(r => new { r.PlatformId, r.PlatformName, r.PlatformDisplayOrder })
            .OrderBy(g => g.Key.PlatformDisplayOrder)
            .ThenBy(g => g.Key.PlatformName, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.Key.PlatformName)
            .ToList();
        var columns = visibleScans
            .Select(s => labelByScanId[s.Id])
            .ToList();

        var cells = new List<HeatmapCellDto>();
        foreach (var platformGroup in visibleRuns.GroupBy(r => new { r.PlatformId, r.PlatformName }))
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

        return new HeatmapDto(platforms, columns, cells);
    }

    // -----------------------------------------------------------------
    // Topic heatmap — topics × platforms, grouped by topic NAME across brands
    // -----------------------------------------------------------------

    private static TopicHeatmapDto BuildTopicHeatmap(
        IReadOnlyList<RunRow> runs,
        IReadOnlyList<PromptTopicRow> promptTopics,
        IReadOnlyDictionary<Guid, int> citationCountByAnswer)
    {
        var topicsByPrompt = promptTopics
            .GroupBy(pt => pt.PromptId)
            .ToDictionary(g => g.Key, g => g.Select(pt => pt.TopicName).Distinct().ToList());

        // Walk every run and tally both answer count + citation count per
        // (topic, platform) cell. A single run carries one answer and its
        // total citations; both numbers accrue to every topic the prompt
        // was tagged with.
        var counts = new Dictionary<(string Topic, string Platform), (int Answers, int Citations)>();
        foreach (var run in runs)
        {
            if (!topicsByPrompt.TryGetValue(run.PromptId, out var topics)) continue;
            var citations = citationCountByAnswer.TryGetValue(run.AnswerId, out var cc) ? cc : 0;
            foreach (var topicName in topics)
            {
                var key = (topicName, run.PlatformName);
                counts.TryGetValue(key, out var cur);
                counts[key] = (cur.Answers + 1, cur.Citations + citations);
            }
        }
        if (counts.Count == 0)
        {
            return new TopicHeatmapDto(
                Array.Empty<string>(), Array.Empty<string>(), Array.Empty<TopicHeatmapCellDto>());
        }

        // Topic ranking stays on AnswerCount so the row set doesn't shuffle
        // when the FE toggles metric.
        var topicTotals = counts
            .GroupBy(kvp => kvp.Key.Topic)
            .Select(g => new { Topic = g.Key, Total = g.Sum(kvp => kvp.Value.Answers) })
            .OrderByDescending(t => t.Total)
            .ThenBy(t => t.Topic, StringComparer.OrdinalIgnoreCase)
            .Take(TopicHeatmapLimit)
            .ToList();
        var topicRows = topicTotals.Select(t => t.Topic).ToList();
        var topicRowSet = topicRows.ToHashSet();

        var platformCols = runs
            .GroupBy(r => new { r.PlatformId, r.PlatformName, r.PlatformDisplayOrder })
            .OrderBy(g => g.Key.PlatformDisplayOrder)
            .ThenBy(g => g.Key.PlatformName, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.Key.PlatformName)
            .ToList();

        var cells = counts
            .Where(kvp => topicRowSet.Contains(kvp.Key.Topic))
            .Select(kvp => new TopicHeatmapCellDto(
                Row: kvp.Key.Topic,
                Column: kvp.Key.Platform,
                AnswerCount: kvp.Value.Answers,
                CitationCount: kvp.Value.Citations))
            .ToList();

        return new TopicHeatmapDto(topicRows, platformCols, cells);
    }

    // -----------------------------------------------------------------
    // Recent chats — interleaved newest-first across trackers
    // -----------------------------------------------------------------

    private static IReadOnlyList<WorkspaceRecentChatDto> BuildRecentChats(
        IReadOnlyList<RunRow> runs,
        IReadOnlyDictionary<Guid, int> mentionCountByAnswer,
        IReadOnlyDictionary<Guid, int> citationCountByAnswer,
        IReadOnlyDictionary<Guid, Sentiment> brandSentimentByAnswer,
        IReadOnlyDictionary<Guid, TrackerRow> trackerById,
        IReadOnlyDictionary<Guid, string> brandNameById)
    {
        return runs
            .OrderByDescending(r => r.AnswerCreatedAt)
            .Take(RecentChatLimit)
            .Select(r =>
            {
                var tracker = trackerById[r.TrackerId];
                var brandName = brandNameById.TryGetValue(tracker.BrandId, out var bn) ? bn : "Unknown";
                return new WorkspaceRecentChatDto(
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
                        ? sent.ToString() : null,
                    TrackerId: tracker.Id,
                    TrackerName: tracker.Name,
                    BrandId: tracker.BrandId,
                    BrandName: brandName);
            })
            .ToList();
    }

    private static string Truncate(string s, int max)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        s = s.Trim();
        return s.Length <= max ? s : s.Substring(0, max).TrimEnd() + "…";
    }

    private sealed record RunRow(
        Guid ScanRunId,
        Guid TrackerId,
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

    private sealed record ScanRow(Guid Id, DateTime StartedAt, Guid TrackerId);
    private sealed record BrandRow(Guid Id, string Name);
    private sealed record TrackerRow(Guid Id, Guid BrandId, string Name);
    private sealed record BrandMentionRow(Guid AIAnswerId, Sentiment Sentiment);
    private sealed record PromptTopicRow(Guid PromptId, string TopicName);
}
