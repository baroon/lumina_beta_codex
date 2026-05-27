using System.Text.Json;
using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Topics;

public class GetScanTopicQueryHandler : IRequestHandler<GetScanTopicQuery, ScanTopicDetailDto?>
{
    private const int TopCitedSourceLimit = 10;

    private readonly IAppDbContext _db;

    public GetScanTopicQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanTopicDetailDto?> Handle(GetScanTopicQuery request, CancellationToken cancellationToken)
    {
        var scanExists = await _db.ScanRuns.AsNoTracking()
            .AnyAsync(s => s.Id == request.ScanRunId, cancellationToken);
        if (!scanExists) return null;

        var topic = await _db.Topics.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TopicId, cancellationToken);
        if (topic == null) return null;

        // Pre-computed Topic-scope metrics for this topic (same source as the
        // list query — single trip, indexed lookup).
        var metricsRows = await _db.ScanMetrics.AsNoTracking()
            .Where(m => m.ScanRunId == request.ScanRunId
                && m.Scope == ScanMetricScope.Topic
                && m.ScopeId == request.TopicId)
            .ToListAsync(cancellationToken);

        var metrics = BuildTopicMetrics(metricsRows);

        // Runtime sub-aggregation needs the set of AIAnswer ids that belong
        // to this topic in this scan. Topic is per-prompt (via PromptTopic),
        // and a PromptRun pins both the Prompt and the AIPlatform — so we
        // walk PromptTopic → Prompt → PromptRun → AIAnswer.
        var topicPromptIds = await _db.PromptTopics.AsNoTracking()
            .Where(pt => pt.TopicId == request.TopicId)
            .Select(pt => pt.PromptId)
            .ToListAsync(cancellationToken);

        if (topicPromptIds.Count == 0)
        {
            return new ScanTopicDetailDto(
                request.ScanRunId, topic.Id, topic.Name,
                metrics, Array.Empty<TopicPlatformBreakdownDto>(), Array.Empty<TopicTopCitedSourceDto>());
        }

        var promptRuns = await _db.PromptRuns.AsNoTracking()
            .Where(pr => pr.ScanRunId == request.ScanRunId && topicPromptIds.Contains(pr.PromptId))
            .Select(pr => new { pr.Id, pr.AIPlatformId })
            .ToListAsync(cancellationToken);
        if (promptRuns.Count == 0)
        {
            return new ScanTopicDetailDto(
                request.ScanRunId, topic.Id, topic.Name,
                metrics, Array.Empty<TopicPlatformBreakdownDto>(), Array.Empty<TopicTopCitedSourceDto>());
        }
        var promptRunIds = promptRuns.Select(pr => pr.Id).ToHashSet();
        var platformByPromptRun = promptRuns.ToDictionary(pr => pr.Id, pr => pr.AIPlatformId);

        var answers = await _db.AIAnswers.AsNoTracking()
            .Where(a => promptRunIds.Contains(a.PromptRunId))
            .Select(a => new { a.Id, a.PromptRunId })
            .ToListAsync(cancellationToken);
        var platformByAnswer = answers.ToDictionary(a => a.Id, a => platformByPromptRun[a.PromptRunId]);
        var answerIds = answers.Select(a => a.Id).ToHashSet();

        var signals = await _db.AnswerSignals.AsNoTracking()
            .Where(s => answerIds.Contains(s.AIAnswerId))
            .ToListAsync(cancellationToken);
        var mentions = await _db.Mentions.AsNoTracking()
            .Where(m => answerIds.Contains(m.AIAnswerId))
            .ToListAsync(cancellationToken);
        var citations = await _db.Citations.AsNoTracking()
            .Where(c => answerIds.Contains(c.AIAnswerId))
            .ToListAsync(cancellationToken);

        var platformIds = platformByPromptRun.Values.Distinct().ToList();
        var platforms = await _db.AIPlatforms.AsNoTracking()
            .Where(p => platformIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p, cancellationToken);

        var byPlatform = platformIds
            .Select(pid => BuildPlatformBreakdown(pid, platforms[pid], platformByAnswer, signals, mentions, citations))
            .Where(b => b.AnswerCount > 0)
            .OrderBy(b => b.PlatformName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var topCited = await BuildTopCitedSources(citations, cancellationToken);

        return new ScanTopicDetailDto(
            request.ScanRunId, topic.Id, topic.Name,
            metrics, byPlatform, topCited);
    }

    private static TopicMetricsDto BuildTopicMetrics(List<ScanMetric> rows)
    {
        double? Single(string name) => rows.FirstOrDefault(r => r.MetricName == name)?.MetricValue;
        int IntOrZero(string name) => (int)(Single(name) ?? 0);

        var sentiment = rows
            .Where(r => r.MetricName == MetricNames.BrandSentimentDistribution && r.MetadataJson != null)
            .Select(r => (Key: ReadSentimentValue(r.MetadataJson!), Count: (int)r.MetricValue))
            .Where(pair => pair.Key is not null)
            .ToDictionary(pair => pair.Key!, pair => pair.Count);

        return new TopicMetricsDto(
            BrandMentionRate: Single(MetricNames.BrandMentionRate),
            BrandRecommendationRate: Single(MetricNames.BrandRecommendationRate),
            BrandShareOfVoice: Single(MetricNames.BrandShareOfVoice),
            AverageBrandRank: Single(MetricNames.AverageBrandRank),
            CitationCount: IntOrZero(MetricNames.CitationCount),
            OwnedCitationCount: IntOrZero(MetricNames.OwnedCitationCount),
            CompetitorCitationCount: IntOrZero(MetricNames.CompetitorCitationCount),
            ThirdPartyCitationCount: IntOrZero(MetricNames.ThirdPartyCitationCount),
            UnknownCitationCount: IntOrZero(MetricNames.UnknownCitationCount),
            BrandSentimentDistribution: sentiment);
    }

    /// <summary>
    /// Topic×Platform sub-aggregation: pivot the topic's per-answer evidence
    /// by the answer's platform. Mirrors the rate-math MetricAggregator
    /// applies at scope level, just on the topic-filtered subset.
    /// </summary>
    private static TopicPlatformBreakdownDto BuildPlatformBreakdown(
        Guid platformId,
        AIPlatform platform,
        IReadOnlyDictionary<Guid, Guid> platformByAnswer,
        IReadOnlyList<AnswerSignal> allSignals,
        IReadOnlyList<Mention> allMentions,
        IReadOnlyList<Citation> allCitations)
    {
        var answerIdsForPlatform = platformByAnswer
            .Where(kvp => kvp.Value == platformId)
            .Select(kvp => kvp.Key)
            .ToHashSet();

        var signals = allSignals.Where(s => answerIdsForPlatform.Contains(s.AIAnswerId)).ToList();
        var mentions = allMentions.Where(m => answerIdsForPlatform.Contains(m.AIAnswerId)).ToList();
        var citations = allCitations.Where(c => answerIdsForPlatform.Contains(c.AIAnswerId)).ToList();

        double? mentionRate = signals.Count > 0
            ? (double)signals.Count(s => s.BrandMentioned) / signals.Count
            : null;
        double? recRate = signals.Count > 0
            ? (double)signals.Count(s => s.BrandRecommended) / signals.Count
            : null;

        var brandMentions = mentions.Count(m => m.EntityType == MentionEntityType.Brand);
        var competitorMentions = mentions.Count(m => m.EntityType == MentionEntityType.Competitor);
        var sovDenom = brandMentions + competitorMentions;
        double? sov = sovDenom > 0 ? (double)brandMentions / sovDenom : null;

        return new TopicPlatformBreakdownDto(
            PlatformId: platformId,
            PlatformCode: platform.Code,
            PlatformName: platform.Name,
            AnswerCount: signals.Count,
            BrandMentionRate: mentionRate,
            BrandRecommendationRate: recRate,
            BrandShareOfVoice: sov,
            CitationCount: citations.Count);
    }

    private async Task<IReadOnlyList<TopicTopCitedSourceDto>> BuildTopCitedSources(
        IReadOnlyList<Citation> citations, CancellationToken ct)
    {
        if (citations.Count == 0) return Array.Empty<TopicTopCitedSourceDto>();

        var sourceIds = citations.Select(c => c.SourceId).Distinct().ToList();
        var sourceNames = await _db.Sources.AsNoTracking()
            .Where(s => sourceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.SourceName, ct);

        return citations
            .GroupBy(c => c.SourceId)
            .Select(g => new TopicTopCitedSourceDto(
                SourceId: g.Key,
                SourceName: sourceNames.TryGetValue(g.Key, out var name) ? name : "unknown",
                CitationCount: g.Count()))
            .OrderByDescending(s => s.CitationCount)
            .ThenBy(s => s.SourceName, StringComparer.OrdinalIgnoreCase)
            .Take(TopCitedSourceLimit)
            .ToList();
    }

    private static string? ReadSentimentValue(string metadataJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(metadataJson);
            return doc.RootElement.TryGetProperty("value", out var v) && v.ValueKind == JsonValueKind.String
                ? v.GetString() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
