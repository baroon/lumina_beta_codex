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

    // Virtual so MetricAggregationJob tests can substitute a stub aggregator
    // without needing a separate interface for a single-implementation class.
    public virtual async Task<List<ScanMetric>> ComputeAsync(Guid scanRunId, CancellationToken cancellationToken)
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
        var pairs = await _db.MentionPairs.AsNoTracking()
            .Where(p => answerIds.Contains(p.AIAnswerId))
            .Select(p => new { p.AIAnswerId, p.MentionAId, p.MentionBId })
            .ToListAsync(cancellationToken);
        // Attributes joined to all mentions in this scan — used per-scope
        // to compute BrandTopAttribute rollups (only the brand's mentions
        // contribute; competitor/product attributes deferred to a later
        // slice).
        var mentionIds = mentions.Select(m => m.Id).ToList();
        var allAttributes = mentionIds.Count == 0
            ? new List<MentionAttribute>()
            : await _db.MentionAttributes.AsNoTracking()
                .Where(a => mentionIds.Contains(a.MentionId))
                .ToListAsync(cancellationToken);

        // Phase 4 Slice 0: citation classification + source display name moved
        // off the citation row onto Source + BrandSourceClassification. Load
        // them once for the scan's brand and pass enriched lookups into the
        // scope builders so they don't have to do the joins inline.
        var brandId = await ResolveBrandIdAsync(scanRunId, cancellationToken);
        var citationLookup = await BuildCitationLookupAsync(citations, brandId, cancellationToken);

        var now = DateTime.UtcNow;
        var rows = new List<ScanMetric>();

        // Overall scope — whole scan, scope_id MUST be null (D15 CHECK).
        rows.AddRange(BuildScopeMetrics(scanRunId, ScanMetricScope.Overall, null,
            contexts, mentions, citations, citationLookup, now));

        // Platform scope — one group per platform that produced an answer.
        foreach (var grp in contexts.GroupBy(c => c.PlatformId))
        {
            EmitGrouped(rows, scanRunId, ScanMetricScope.Platform, grp.Key,
                grp.ToList(), mentions, citations, citationLookup, now);
        }

        // Lens scope — one group per lens that the scan touched.
        foreach (var grp in contexts.GroupBy(c => c.LensId))
        {
            EmitGrouped(rows, scanRunId, ScanMetricScope.Lens, grp.Key,
                grp.ToList(), mentions, citations, citationLookup, now);
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
                grp.Select(x => x.Context).ToList(), mentions, citations, citationLookup, now);
        }

        // Co-mention map: competitorId → distinct AIAnswerIds where this
        // competitor co-occurred with our brand. Built once from the pairs
        // + mentions tables so every competitor's Competitor-scope rollup
        // can read it in O(1).
        var coMentionsByCompetitor = BuildBrandCoMentionMap(pairs, mentions, brandId);

        // Competitor scope — per-tracked-competitor MentionCount + RecommendationCount
        // + CoMentionedWithBrandCount + ShareOfVoice. Only emitted for
        // competitors that actually had at least one mention; the co-mention
        // count is 0 when they appeared but never alongside our brand.
        //
        // SoV denominator mirrors BrandShareOfVoice (brand + competitor mention
        // counts across the scan). Denominator-zero is unreachable here: the
        // outer foreach only runs for competitors with ≥1 Mention row.
        var sovDenom = mentions.Count(m =>
            m.EntityType == MentionEntityType.Brand ||
            m.EntityType == MentionEntityType.Competitor);
        foreach (var grp in mentions
            .Where(m => m.EntityType == MentionEntityType.Competitor)
            .GroupBy(m => m.EntityId))
        {
            rows.Add(MetricRow(scanRunId, ScanMetricScope.Competitor, grp.Key,
                MetricNames.MentionCount, grp.Count(), now));
            rows.Add(MetricRow(scanRunId, ScanMetricScope.Competitor, grp.Key,
                MetricNames.RecommendationCount, grp.Count(m => m.IsRecommended), now));
            var coCount = coMentionsByCompetitor.TryGetValue(grp.Key, out var set) ? set.Count : 0;
            rows.Add(MetricRow(scanRunId, ScanMetricScope.Competitor, grp.Key,
                MetricNames.CoMentionedWithBrandCount, coCount, now));
            rows.Add(MetricRow(scanRunId, ScanMetricScope.Competitor, grp.Key,
                MetricNames.CompetitorShareOfVoice, (double)grp.Count() / sovDenom, now));
        }

        // Overall scope — distinct competitors that ever co-appeared with us.
        // Counts only entries with at least one co-mention; emitted always
        // (zero is a legitimate signal: "AI never paired us with anyone").
        var distinctCoMentioned = coMentionsByCompetitor.Count(kv => kv.Value.Count > 0);
        rows.Add(MetricRow(scanRunId, ScanMetricScope.Overall, null,
            MetricNames.DistinctCoMentionedBrandCount, distinctCoMentioned, now));

        // BrandTopAttribute — top-10 attributes the AI ascribed to the
        // brand, computed at each non-Competitor scope from the loaded
        // MentionAttribute rows. Brand attributes only for this slice;
        // per-competitor / per-product attributes deferred.
        var brandAttributes = allAttributes
            .Join(mentions.Where(m => m.EntityType == MentionEntityType.Brand && m.EntityId == brandId),
                a => a.MentionId, m => m.Id,
                (a, m) => new { Attribute = a, Mention = m })
            .ToList();

        // Overall scope.
        rows.AddRange(BuildBrandTopAttributes(scanRunId, ScanMetricScope.Overall, null,
            brandAttributes.Select(x => x.Attribute), now));

        // Platform scope.
        var attrByAnswer = brandAttributes
            .ToLookup(x => x.Mention.AIAnswerId, x => x.Attribute);
        foreach (var grp in contexts.GroupBy(c => c.PlatformId))
        {
            var scoped = grp.SelectMany(c => attrByAnswer[c.AIAnswerId]);
            rows.AddRange(BuildBrandTopAttributes(scanRunId, ScanMetricScope.Platform, grp.Key, scoped, now));
        }

        // Lens scope.
        foreach (var grp in contexts.GroupBy(c => c.LensId))
        {
            var scoped = grp.SelectMany(c => attrByAnswer[c.AIAnswerId]);
            rows.AddRange(BuildBrandTopAttributes(scanRunId, ScanMetricScope.Lens, grp.Key, scoped, now));
        }

        // Topic scope — one (topic, attribute) row per linked topic.
        var topicGroupsForAttrs = contexts
            .SelectMany(c => c.TopicIds.Select(t => (TopicId: t, Context: c)))
            .GroupBy(x => x.TopicId);
        foreach (var grp in topicGroupsForAttrs)
        {
            var scoped = grp.SelectMany(x => attrByAnswer[x.Context.AIAnswerId]);
            rows.AddRange(BuildBrandTopAttributes(scanRunId, ScanMetricScope.Topic, grp.Key, scoped, now));
        }

        return rows;
    }

    /// <summary>
    /// Emits up to 10 BrandTopAttribute rows for a single scope from the
    /// supplied attribute set. Groups by attribute name (case-insensitive
    /// since the extractor already normalises), counts mentions, picks the
    /// mode polarity per attribute, sorts by count desc → name asc, and
    /// truncates to 10. Empty input → no rows.
    /// </summary>
    private static IEnumerable<ScanMetric> BuildBrandTopAttributes(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        IEnumerable<MentionAttribute> scopedAttributes, DateTime now)
    {
        var grouped = scopedAttributes
            .GroupBy(a => a.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g => new
            {
                Name = g.Key,
                Count = g.Count(),
                Polarity = g
                    .GroupBy(a => a.Polarity)
                    .OrderByDescending(pg => pg.Count())
                    .Select(pg => pg.Key)
                    .First(),
            })
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .ToList();

        var rank = 0;
        foreach (var entry in grouped)
        {
            rank++;
            var metadata = System.Text.Json.JsonSerializer.Serialize(new
            {
                attribute = entry.Name,
                polarity = entry.Polarity.ToString(),
                rank,
            });
            yield return MetricRowWithMetadata(scanRunId, scope, scopeId,
                MetricNames.BrandTopAttribute, entry.Count, metadata, now);
        }
    }

    /// <summary>
    /// Walks the MentionPair table for the scan and builds a map from each
    /// tracked competitor's entity_id to the set of distinct AIAnswer ids
    /// where that competitor was paired with our tracked brand. Uses the
    /// pair's mention ids to join back to the resolved EntityType +
    /// EntityId on Mention.
    /// </summary>
    private static Dictionary<Guid, HashSet<Guid>> BuildBrandCoMentionMap(
        IReadOnlyList<dynamic> pairs, List<Mention> mentions, Guid brandId)
    {
        var mentionLookup = mentions.ToDictionary(m => m.Id, m => m);
        var result = new Dictionary<Guid, HashSet<Guid>>();
        foreach (var p in pairs)
        {
            if (!mentionLookup.TryGetValue((Guid)p.MentionAId, out var a)) continue;
            if (!mentionLookup.TryGetValue((Guid)p.MentionBId, out var b)) continue;

            // We only care about pairs where one side is the tracked brand
            // and the other is a tracked competitor. Pure competitor↔competitor
            // or competitor↔product pairs are interesting for later slices.
            Mention? competitor = null;
            if (a.EntityType == MentionEntityType.Brand && a.EntityId == brandId
                && b.EntityType == MentionEntityType.Competitor)
            {
                competitor = b;
            }
            else if (b.EntityType == MentionEntityType.Brand && b.EntityId == brandId
                && a.EntityType == MentionEntityType.Competitor)
            {
                competitor = a;
            }
            if (competitor is null) continue;

            if (!result.TryGetValue(competitor.EntityId, out var set))
            {
                set = new HashSet<Guid>();
                result[competitor.EntityId] = set;
            }
            set.Add((Guid)p.AIAnswerId);
        }
        return result;
    }

    private static void EmitGrouped(
        List<ScanMetric> sink,
        Guid scanRunId, ScanMetricScope scope, Guid scopeId,
        List<AnswerContext> grouped,
        List<Mention> allMentions, List<Citation> allCitations,
        IReadOnlyDictionary<Guid, CitationView> citationLookup,
        DateTime now)
    {
        var ids = grouped.Select(c => c.AIAnswerId).ToHashSet();
        var groupedMentions = allMentions.Where(m => ids.Contains(m.AIAnswerId)).ToList();
        var groupedCitations = allCitations.Where(c => ids.Contains(c.AIAnswerId)).ToList();
        sink.AddRange(BuildScopeMetrics(scanRunId, scope, scopeId, grouped,
            groupedMentions, groupedCitations, citationLookup, now));
    }

    private static IEnumerable<ScanMetric> BuildScopeMetrics(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        List<AnswerContext> contexts,
        List<Mention> mentions, List<Citation> citations,
        IReadOnlyDictionary<Guid, CitationView> citationLookup,
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

        // Brand prominence — count of total brand-name appearances + mean
        // first-mention position. The count complements BrandMentionRate
        // (binary "did the brand appear?") with "how many times in total."
        // The position is only meaningful when the brand was mentioned at
        // all; skip when there are no brand mentions in scope.
        var brandMentions = mentions.Where(m => m.EntityType == MentionEntityType.Brand).ToList();
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.BrandMentionCount,
            brandMentions.Sum(m => m.MentionCount), now);
        if (brandMentions.Count > 0)
        {
            yield return MetricRow(scanRunId, scope, scopeId, MetricNames.BrandFirstMentionPosition,
                brandMentions.Average(m => m.FirstMentionPosition), now);
        }

        // Phase 4 Slice 0: citation classification lookup via
        // BrandSourceClassification. Bucket the 12-value SourceType taxonomy
        // back into the 4 reporting buckets the DTO surface still uses.
        var ownedCount = 0;
        var competitorCount = 0;
        var thirdPartyCount = 0;
        var unknownCount = 0;
        foreach (var c in citations)
        {
            var st = citationLookup.TryGetValue(c.Id, out var v) ? v.SourceType : SourceType.Unknown;
            switch (st)
            {
                case SourceType.Owned: ownedCount++; break;
                case SourceType.Competitor: competitorCount++; break;
                case SourceType.Unknown: unknownCount++; break;
                default: thirdPartyCount++; break;   // Corporate/UGC/Editorial/etc. → ThirdParty bucket
            }
        }

        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.CitationCount,
            citations.Count, now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.OwnedCitationCount,
            ownedCount, now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.CompetitorCitationCount,
            competitorCount, now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.ThirdPartyCitationCount,
            thirdPartyCount, now);
        yield return MetricRow(scanRunId, scope, scopeId, MetricNames.UnknownCitationCount,
            unknownCount, now);

        // Slice-(c)-followup aggregates emit at every non-Competitor scope.
        if (scope != ScanMetricScope.Competitor)
        {
            foreach (var row in BuildShareOfVoice(scanRunId, scope, scopeId, mentions, now)) yield return row;
            foreach (var row in BuildSentimentDistribution(scanRunId, scope, scopeId, contexts, now)) yield return row;
            foreach (var row in BuildSentimentScore(scanRunId, scope, scopeId, contexts, now)) yield return row;
            foreach (var row in BuildRecommendationScore(scanRunId, scope, scopeId, contexts, now)) yield return row;
            foreach (var row in BuildLeadShare(scanRunId, scope, scopeId, contexts, mentions, now)) yield return row;
            foreach (var row in BuildTopCitedSources(scanRunId, scope, scopeId, citations, citationLookup, now)) yield return row;
        }
    }

    private static IEnumerable<ScanMetric> BuildShareOfVoice(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        List<Mention> mentions, DateTime now)
    {
        var brand = mentions.Count(m => m.EntityType == MentionEntityType.Brand);
        var competitor = mentions.Count(m => m.EntityType == MentionEntityType.Competitor);
        var denom = brand + competitor;
        // Denominator-zero guard — no "voice" to share. Skip rather than emit
        // 0 or NaN; reporting consumers should treat absent-metric as "no data".
        if (denom == 0) yield break;
        yield return MetricRow(scanRunId, scope, scopeId,
            MetricNames.BrandShareOfVoice, (double)brand / denom, now);
    }

    /// <summary>
    /// Lead share: fraction of answers (with ≥1 mention) where the brand
    /// was the first-named entity by Mention.FirstMentionPosition. Strong
    /// preference signal independent of explicit ranking — "Apple, Google,
    /// Microsoft are top picks" puts Apple as the leader without a rank-1
    /// claim. Skipped (no row) when no answers in scope had any mentions
    /// (denominator-zero, same pattern as BrandShareOfVoice). Ties on
    /// `min(first_mention_position)` resolve in the brand's favour by
    /// virtue of OrderBy → First; in practice ties are rare since the
    /// extractor normalises positions to char-offsets.
    /// </summary>
    private static IEnumerable<ScanMetric> BuildLeadShare(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        List<AnswerContext> contexts, List<Mention> mentions, DateTime now)
    {
        var scopedAnswerIds = contexts.Select(c => c.AIAnswerId).ToHashSet();
        var mentionsByAnswer = mentions
            .Where(m => scopedAnswerIds.Contains(m.AIAnswerId))
            .GroupBy(m => m.AIAnswerId)
            .ToList();
        if (mentionsByAnswer.Count == 0) yield break;

        var leadCount = 0;
        foreach (var grp in mentionsByAnswer)
        {
            var first = grp.OrderBy(m => m.FirstMentionPosition).First();
            if (first.EntityType == MentionEntityType.Brand)
            {
                leadCount++;
            }
        }
        yield return MetricRow(scanRunId, scope, scopeId,
            MetricNames.BrandFirstMentionRate,
            (double)leadCount / mentionsByAnswer.Count, now);
    }

    /// <summary>
    /// Mean BrandSentimentScore across signals where the brand was
    /// mentioned. Skipped when no signals in scope had the brand mentioned
    /// (denominator-zero — reporting treats absent as no-data, parallel to
    /// the BrandShareOfVoice / BrandFirstMentionPosition pattern).
    /// </summary>
    private static IEnumerable<ScanMetric> BuildSentimentScore(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        List<AnswerContext> contexts, DateTime now)
    {
        var mentioned = contexts.Where(c => c.Signal.BrandMentioned).ToList();
        if (mentioned.Count == 0) yield break;
        var avg = mentioned.Average(c => c.Signal.BrandSentimentScore);
        yield return MetricRow(scanRunId, scope, scopeId,
            MetricNames.BrandSentimentScore, avg, now);
    }

    /// <summary>
    /// Mean BrandRecommendationScore across signals where the brand was
    /// mentioned. Same denominator-zero pattern as BuildSentimentScore —
    /// no row when nobody in scope mentioned the brand.
    /// </summary>
    private static IEnumerable<ScanMetric> BuildRecommendationScore(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        List<AnswerContext> contexts, DateTime now)
    {
        var mentioned = contexts.Where(c => c.Signal.BrandMentioned).ToList();
        if (mentioned.Count == 0) yield break;
        var avg = mentioned.Average(c => c.Signal.BrandRecommendationScore);
        yield return MetricRow(scanRunId, scope, scopeId,
            MetricNames.BrandRecommendationScore, avg, now);
    }

    private static IEnumerable<ScanMetric> BuildSentimentDistribution(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        List<AnswerContext> contexts, DateTime now)
    {
        // Group by observed sentiment value and emit one row per group. Unobserved
        // sentiment values produce no row (the distribution matches reality, not
        // the enum surface).
        foreach (var grp in contexts.GroupBy(c => c.Signal.BrandSentiment))
        {
            yield return MetricRowWithMetadata(scanRunId, scope, scopeId,
                MetricNames.BrandSentimentDistribution, grp.Count(),
                System.Text.Json.JsonSerializer.Serialize(new { value = grp.Key.ToString() }),
                now);
        }
    }

    private static IEnumerable<ScanMetric> BuildTopCitedSources(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        List<Citation> citations,
        IReadOnlyDictionary<Guid, CitationView> citationLookup,
        DateTime now)
    {
        // Top-K most cited (K=5). Phase 4 Slice 0: source display name comes
        // from the normalized Source row (via the citationLookup), not from a
        // dropped column on the citation. Ties broken by name alphabetically.
        const int TopK = 5;
        var ranked = citations
            .Select(c => citationLookup.TryGetValue(c.Id, out var v) ? v.SourceName : "unknown")
            .GroupBy(name => name)
            .Select(g => new { Source = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Source, StringComparer.Ordinal)
            .Take(TopK)
            .ToList();

        var rank = 1;
        foreach (var entry in ranked)
        {
            // JsonSerializer handles all escaping (quotes, backslashes, control
            // chars, unicode). Hand-rolled interpolation broke against real LLM
            // source names like "American Society of Landscape Architects
            // (ASLA)" — Postgres jsonb rejected the row and the whole
            // aggregation rolled back. Don't roll your own JSON.
            yield return MetricRowWithMetadata(scanRunId, scope, scopeId,
                MetricNames.TopCitedSource, entry.Count,
                System.Text.Json.JsonSerializer.Serialize(new { source_name = entry.Source, rank }),
                now);
            rank++;
        }
    }

    private static ScanMetric MetricRowWithMetadata(
        Guid scanRunId, ScanMetricScope scope, Guid? scopeId,
        string name, double value, string metadataJson, DateTime now) => new()
    {
        Id = Guid.NewGuid(),
        ScanRunId = scanRunId,
        Scope = scope,
        ScopeId = scopeId,
        MetricName = name,
        MetricValue = value,
        MetadataJson = metadataJson,
        CreatedAt = now,
    };

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

    private async Task<Guid> ResolveBrandIdAsync(Guid scanRunId, CancellationToken ct)
    {
        // One small lookup — scan → tracker → brand_id. Used to scope the
        // brand_source_classifications query.
        var brandId = await _db.ScanRuns.AsNoTracking()
            .Where(s => s.Id == scanRunId)
            .Join(_db.TrackerConfigurations.AsNoTracking(),
                s => s.TrackerConfigurationId, t => t.Id, (_, t) => t.BrandId)
            .FirstOrDefaultAsync(ct);
        return brandId;
    }

    /// <summary>
    /// Per-citation joined view of (source name, SourceType) for the scan's
    /// citations, scoped to the scan's brand. Phase 4 Slice 0 replaces the
    /// inline citation.classification / citation.normalized_source_name
    /// columns with this lookup.
    /// </summary>
    private sealed record CitationView(string SourceName, SourceType SourceType);

    private async Task<IReadOnlyDictionary<Guid, CitationView>> BuildCitationLookupAsync(
        IReadOnlyList<Citation> citations, Guid brandId, CancellationToken ct)
    {
        if (citations.Count == 0) return new Dictionary<Guid, CitationView>();

        var sourceIds = citations.Select(c => c.SourceId).Distinct().ToList();
        var sources = await _db.Sources.AsNoTracking()
            .Where(s => sourceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.SourceName, ct);
        var classifications = await _db.BrandSourceClassifications.AsNoTracking()
            .Where(c => c.BrandId == brandId && sourceIds.Contains(c.SourceId))
            .ToDictionaryAsync(c => c.SourceId, c => c.SourceType, ct);

        var lookup = new Dictionary<Guid, CitationView>(citations.Count);
        foreach (var c in citations)
        {
            var name = sources.TryGetValue(c.SourceId, out var n) ? n : "unknown";
            var type = classifications.TryGetValue(c.SourceId, out var st) ? st : SourceType.Unknown;
            lookup[c.Id] = new CitationView(name, type);
        }
        return lookup;
    }
}
