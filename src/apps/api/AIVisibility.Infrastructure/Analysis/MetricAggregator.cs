using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Computes <see cref="ScanMetric"/> rows for one scan (Phase 3 plan §4 step 3,
/// D15). Aggregates the per-answer evidence produced by Slice 2's
/// <see cref="SignalExtractor"/> across five scopes (Overall, Platform, Lens,
/// Topic, Competitor). SourceType scope is reserved for Phase 4 Slice 0
/// (D14 hard gate).
///
/// Concrete class mirroring <see cref="SignalExtractor"/>'s shape per D8 —
/// interface-for-one-impl is the smell. Pure read of the DB; produces a
/// <c>List&lt;ScanMetric&gt;</c> for the calling job to persist in one batch.
/// </summary>
public class MetricAggregator
{
    private readonly IAppDbContext _db;
    private readonly ILogger<MetricAggregator> _logger;

    public MetricAggregator(IAppDbContext db, ILogger<MetricAggregator> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<ScanMetric>> ComputeAsync(Guid scanRunId, CancellationToken cancellationToken)
    {
        var contexts = await LoadAnswerContextsAsync(scanRunId, cancellationToken);
        if (contexts.Count == 0)
        {
            _logger.LogInformation(
                "MetricAggregator: scan {ScanRunId} has no extracted signals; emitting zero metric rows.",
                scanRunId);
            return new List<ScanMetric>();
        }

        var answerIds = contexts.Select(c => c.AIAnswerId).ToHashSet();
        var mentions = await _db.Mentions.AsNoTracking()
            .Where(m => answerIds.Contains(m.AIAnswerId))
            .ToListAsync(cancellationToken);
        var citations = await _db.Citations.AsNoTracking()
            .Where(c => answerIds.Contains(c.AIAnswerId))
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var rows = new List<ScanMetric>();

        // Overall scope — whole scan, scope_id MUST be null (D15 CHECK).
        rows.AddRange(BuildScopeMetrics(scanRunId, ScanMetricScope.Overall, null,
            contexts, mentions, citations, now));

        // Platform scope — one group per platform that produced an answer.
        foreach (var grp in contexts.GroupBy(c => c.PlatformId))
        {
            EmitGrouped(rows, scanRunId, ScanMetricScope.Platform, grp.Key,
                grp.ToList(), mentions, citations, now);
        }

        // Lens scope — one group per lens that the scan touched.
        foreach (var grp in contexts.GroupBy(c => c.LensId))
        {
            EmitGrouped(rows, scanRunId, ScanMetricScope.Lens, grp.Key,
                grp.ToList(), mentions, citations, now);
        }

        // Topic scope — one row per (topic, answer) link. An answer can belong
        // to multiple topics, so a single answer's signals contribute to every
        // topic it's mapped to.
        var topicGroups = contexts
            .SelectMany(c => c.TopicIds.Select(t => (TopicId: t, Context: c)))
            .GroupBy(x => x.TopicId);
        foreach (var grp in topicGroups)
        {
            EmitGrouped(rows, scanRunId, ScanMetricScope.Topic, grp.Key,
                grp.Select(x => x.Context).ToList(), mentions, citations, now);
        }

        // Competitor scope — per-tracked-competitor MentionCount + RecommendationCount.
        // Only emitted for competitors that actually had at least one mention.
        foreach (var grp in mentions
            .Where(m => m.EntityType == MentionEntityType.Competitor)
            .GroupBy(m => m.EntityId))
        {
            rows.Add(MetricRow(scanRunId, ScanMetricScope.Competitor, grp.Key,
                MetricNames.MentionCount, grp.Count(), now));
            rows.Add(MetricRow(scanRunId, ScanMetricScope.Competitor, grp.Key,
                MetricNames.RecommendationCount, grp.Count(m => m.IsRecommended), now));
        }

        return rows;
    }

    private static void EmitGrouped(
        List<ScanMetric> sink,
        Guid scanRunId, ScanMetricScope scope, Guid scopeId,
        List<AnswerContext> grouped,
        List<Mention> allMentions, List<Citation> allCitations,
        DateTime now)
    {
        var ids = grouped.Select(c => c.AIAnswerId).ToHashSet();
        var groupedMentions = allMentions.Where(m => ids.Contains(m.AIAnswerId)).ToList();
        var groupedCitations = allCitations.Where(c => ids.Contains(c.AIAnswerId)).ToList();
        sink.AddRange(BuildScopeMetrics(scanRunId, scope, scopeId, grouped,
            groupedMentions, groupedCitations, now));
    }

    private static IEnumerable<ScanMetric> BuildScopeMetrics(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        List<AnswerContext> contexts,
        List<Mention> mentions, List<Citation> citations,
        DateTime now)
    {
        if (contexts.Count == 0) yield break;

        var total = contexts.Count;
        var brandMentioned = contexts.Count(c => c.Signal.BrandMentioned);
        var brandRecommended = contexts.Count(c => c.Signal.BrandRecommended);

        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.BrandMentionRate,
            (double)brandMentioned / total, now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.BrandRecommendationRate,
            (double)brandRecommended / total, now);

        var ranked = contexts.Where(c => c.Signal.BrandRank.HasValue).ToList();
        if (ranked.Count > 0)
        {
            // Average over ranked answers only (D11: brand_rank is null when the
            // answer has no ranking — including absent answers as 0-rank would
            // dilute the average meaninglessly).
            var avg = ranked.Average(c => (double)c.Signal.BrandRank!.Value);
            yield return MetricRow(scanRunId, scope, scopeId, MetricNames.AverageBrandRank,
                avg, now);
        }

        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.CompetitorMentionCount,
            mentions.Count(m => m.EntityType == MentionEntityType.Competitor), now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.ProductMentionCount,
            mentions.Count(m => m.EntityType == MentionEntityType.Product), now);

        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.CitationCount,
            citations.Count, now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.OwnedCitationCount,
            citations.Count(c => c.Classification == SourceClassification.Owned), now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.CompetitorCitationCount,
            citations.Count(c => c.Classification == SourceClassification.Competitor), now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.ThirdPartyCitationCount,
            citations.Count(c => c.Classification == SourceClassification.ThirdParty), now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.UnknownCitationCount,
            citations.Count(c => c.Classification == SourceClassification.Unknown), now);
    }

    private static ScanMetric MetricRow(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        string name, double value, DateTime now) => new()
    {
        Id = Guid.NewGuid(),
        ScanRunId = scanRunId,
        Scope = scope,
        ScopeId = scopeId,
        MetricName = name,
        MetricValue = value,
        CreatedAt = now,
    };

    /// <summary>
    /// Per-answer dimensional context: which platform/lens/topics produced the
    /// answer, plus the extracted signal. Only answers that produced a signal
    /// are included — answers where extraction returned null (D3) are
    /// excluded from aggregation.
    /// </summary>
    private sealed record AnswerContext(
        Guid AIAnswerId,
        Guid PlatformId,
        Guid LensId,
        IReadOnlyList<Guid> TopicIds,
        AnswerSignal Signal);

    private async Task<List<AnswerContext>> LoadAnswerContextsAsync(
        Guid scanRunId, CancellationToken ct)
    {
        var promptRuns = await _db.PromptRuns.AsNoTracking()
            .Where(pr => pr.ScanRunId == scanRunId)
            .Select(pr => new { pr.Id, pr.PromptId, pr.AIPlatformId })
            .ToListAsync(ct);
        if (promptRuns.Count == 0) return new List<AnswerContext>();

        var promptIds = promptRuns.Select(pr => pr.PromptId).Distinct().ToList();
        var prompts = await _db.Prompts.AsNoTracking()
            .Where(p => promptIds.Contains(p.Id))
            .Select(p => new { p.Id, p.LensId })
            .ToListAsync(ct);
        var lensByPrompt = prompts.ToDictionary(p => p.Id, p => p.LensId);

        var promptTopics = await _db.PromptTopics.AsNoTracking()
            .Where(pt => promptIds.Contains(pt.PromptId))
            .Select(pt => new { pt.PromptId, pt.TopicId })
            .ToListAsync(ct);
        var topicsByPrompt = promptTopics
            .GroupBy(pt => pt.PromptId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<Guid>)g.Select(pt => pt.TopicId).ToList());

        var promptRunIds = promptRuns.Select(pr => pr.Id).ToHashSet();
        var answers = await _db.AIAnswers.AsNoTracking()
            .Where(a => promptRunIds.Contains(a.PromptRunId))
            .Select(a => new { a.Id, a.PromptRunId })
            .ToListAsync(ct);

        var answerIds = answers.Select(a => a.Id).ToHashSet();
        var signals = await _db.AnswerSignals.AsNoTracking()
            .Where(s => answerIds.Contains(s.AIAnswerId))
            .ToListAsync(ct);
        var signalByAnswer = signals.ToDictionary(s => s.AIAnswerId);
        var promptRunById = promptRuns.ToDictionary(pr => pr.Id);

        var contexts = new List<AnswerContext>(answers.Count);
        foreach (var a in answers)
        {
            if (!signalByAnswer.TryGetValue(a.Id, out var signal)) continue;
            var pr = promptRunById[a.PromptRunId];
            if (!lensByPrompt.TryGetValue(pr.PromptId, out var lensId)) continue;
            var topicIds = topicsByPrompt.TryGetValue(pr.PromptId, out var t)
                ? t : Array.Empty<Guid>();
            contexts.Add(new AnswerContext(a.Id, pr.AIPlatformId, lensId, topicIds, signal));
        }
        return contexts;
    }
}
