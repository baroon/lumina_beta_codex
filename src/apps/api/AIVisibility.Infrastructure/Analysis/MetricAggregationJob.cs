using System.Text.Json;
using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Reads Slice 2's extracted evidence (AnswerSignal + Mention + Citation rows)
/// for the scan and persists a batch of <see cref="Domain.Entities.ScanMetric"/>
/// rows across five scopes — Overall, Platform, Lens, Topic, Competitor — via
/// <see cref="MetricAggregator"/> (Phase 3 plan §4 step 3, D15). On exit
/// flips <see cref="Domain.Enums.AnalysisJobStatus.Completed"/>.
///
/// Retry policy per D3: 1 attempt. Aggregation is deterministic SQL/in-memory
/// math; if it fails twice the issue is code/data not transient.
/// </summary>
public class MetricAggregationJob : IMetricAggregationJob
{
    private readonly IAppDbContext _db;
    private readonly MetricAggregator _aggregator;
    private readonly ILogger<MetricAggregationJob> _logger;

    public MetricAggregationJob(
        IAppDbContext db,
        MetricAggregator aggregator,
        ILogger<MetricAggregationJob> logger)
    {
        _db = db;
        _aggregator = aggregator;
        _logger = logger;
    }

    // [AutomaticRetry] lives on the interface (IMetricAggregationJob) because
    // ScanExecutor chains via interface type and Hangfire reads filter
    // attributes from the serialized job target. See IMetricAggregationJob.
    public async Task AggregateAsync(Guid analysisJobId, CancellationToken cancellationToken)
    {
        var job = await _db.AnalysisJobs.FirstOrDefaultAsync(j => j.Id == analysisJobId, cancellationToken)
            ?? throw new InvalidOperationException($"AnalysisJob {analysisJobId} not found.");

        job.AggregateStartedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            var rows = await _aggregator.ComputeAsync(job.ScanRunId, cancellationToken);
            foreach (var row in rows)
            {
                _db.ScanMetrics.Add(row);
            }
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "MetricAggregator wrote {Count} ScanMetric rows for AnalysisJob {AnalysisJobId} (scan {ScanRunId}).",
                rows.Count, analysisJobId, job.ScanRunId);

            // Phase 4 v2 D3: denormalize per-entity trend rows so the dashboard
            // can render one series per tracked brand + competitor without
            // re-aggregating ScanMetric on every render.
            await WriteTrendPointsAsync(job.ScanRunId, rows, cancellationToken);

            job.AggregateCompletedAt = DateTime.UtcNow;
            job.Status = AnalysisJobStatus.Completed;
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "MetricAggregationJob threw for AnalysisJob {AnalysisJobId}", analysisJobId);
            job.Status = AnalysisJobStatus.Failed;
            job.ErrorMessage = $"{ex.GetType().Name}: {ex.Message}";
            await _db.SaveChangesAsync(CancellationToken.None);
            throw;
        }
    }

    // -----------------------------------------------------------------
    // Trend point denormalization (Phase 4 v2 D3)
    // -----------------------------------------------------------------

    /// <summary>
    /// Captures trend points per (entity, metric) for the scan. The tracked
    /// brand gets the 6 dashboard metrics; each tracked competitor gets
    /// MentionCount + RecommendationCount + derived MentionRate +
    /// RecommendationRate. Null values are preserved for metrics the
    /// aggregator skipped (denominator-zero) — the chart renders these as
    /// gaps so missing-data is visually distinct from real zero.
    /// </summary>
    private async Task WriteTrendPointsAsync(
        Guid scanRunId, IReadOnlyList<ScanMetric> rows, CancellationToken ct)
    {
        var scanInfo = await _db.ScanRuns.AsNoTracking()
            .Where(s => s.Id == scanRunId)
            .Select(s => new
            {
                s.TrackerConfigurationId,
                s.StartedAt,
                s.CompletedAt,
                BrandId = s.TrackerConfiguration.BrandId,
            })
            .FirstOrDefaultAsync(ct);
        if (scanInfo == null) return;

        var capturedAt = scanInfo.CompletedAt ?? scanInfo.StartedAt;
        var trackerId = scanInfo.TrackerConfigurationId;
        var brandId = scanInfo.BrandId;
        var now = DateTime.UtcNow;

        // Total answer count for the scan — denominator for competitor
        // MentionRate. Only count answers that produced a signal (matches
        // the aggregator's view of "successful answers"; bad-JSON answers
        // dropped by the D3 catch-and-continue path are excluded).
        var totalAnswers = await (
            from a in _db.AIAnswers.AsNoTracking()
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.AnswerSignals.AsNoTracking() on a.Id equals s.AIAnswerId
            where pr.ScanRunId == scanRunId
            select a.Id
        ).CountAsync(ct);

        var overall = rows.Where(r => r.Scope == ScanMetricScope.Overall).ToList();
        AddBrandTrendPoints(brandId, trackerId, scanRunId, capturedAt, now, overall);

        // Per-tracked-competitor trend rows. Even competitors that weren't
        // mentioned in this scan get a row (with MentionCount=0) so the
        // multi-line chart renders a continuous series for every tracked
        // entity rather than disappearing rows mid-stream.
        var trackedCompetitorIds = await _db.TrackerCompetitors.AsNoTracking()
            .Where(tc => tc.TrackerConfigurationId == trackerId)
            .Select(tc => tc.CompetitorId)
            .ToListAsync(ct);

        var competitorMetrics = rows
            .Where(r => r.Scope == ScanMetricScope.Competitor && r.ScopeId.HasValue)
            .GroupBy(r => r.ScopeId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var competitorId in trackedCompetitorIds)
        {
            competitorMetrics.TryGetValue(competitorId, out var compMetrics);
            AddCompetitorTrendPoints(
                competitorId, trackerId, scanRunId, capturedAt, now,
                compMetrics ?? new List<ScanMetric>(),
                totalAnswers);
        }
    }

    /// <summary>
    /// Brand-entity trend rows — the 5 numeric metrics + categorical
    /// OverallSentiment. Same shape v1 emitted, just tagged with
    /// <see cref="TrendEntityType.Brand"/> + brand id now.
    /// </summary>
    private void AddBrandTrendPoints(
        Guid brandId, Guid trackerId, Guid scanRunId, DateTime capturedAt, DateTime now,
        IReadOnlyList<ScanMetric> overall)
    {
        double? Read(string name) => overall.FirstOrDefault(r => r.MetricName == name)?.MetricValue;
        int IntOrZero(string name) => (int)(Read(name) ?? 0);

        var citationCount = IntOrZero(MetricNames.CitationCount);
        var ownedCount = IntOrZero(MetricNames.OwnedCitationCount);
        double? ownedShare = citationCount > 0 ? (double)ownedCount / citationCount : null;

        var numericTrends = new (string Name, double? Value)[]
        {
            (MetricNames.BrandMentionRate, Read(MetricNames.BrandMentionRate)),
            (MetricNames.BrandRecommendationRate, Read(MetricNames.BrandRecommendationRate)),
            (MetricNames.BrandShareOfVoice, Read(MetricNames.BrandShareOfVoice)),
            (MetricNames.AverageBrandRank, Read(MetricNames.AverageBrandRank)),
            (TrendMetrics.OwnedCitationShare, ownedShare),
        };
        foreach (var (name, value) in numericTrends)
        {
            _db.TrendPoints.Add(NewPoint(trackerId, scanRunId, TrendEntityType.Brand, brandId,
                name, value, null, capturedAt, now));
        }

        // OverallSentiment: mode of the brand's sentiment distribution.
        var sentimentMode = overall
            .Where(r => r.MetricName == MetricNames.BrandSentimentDistribution && r.MetadataJson != null)
            .OrderByDescending(r => r.MetricValue)
            .Select(r => ReadSentimentValue(r.MetadataJson!))
            .FirstOrDefault(s => s is not null);
        _db.TrendPoints.Add(NewPoint(trackerId, scanRunId, TrendEntityType.Brand, brandId,
            TrendMetrics.OverallSentiment, null, sentimentMode, capturedAt, now));
    }

    /// <summary>
    /// Competitor-entity trend rows. Aggregator's Competitor scope already
    /// emits MentionCount + RecommendationCount; derived rates compute
    /// here. Untracked competitors don't get rows (Mention.EntityId joins
    /// to TrackerCompetitor.CompetitorId only).
    /// </summary>
    private void AddCompetitorTrendPoints(
        Guid competitorId, Guid trackerId, Guid scanRunId, DateTime capturedAt, DateTime now,
        IReadOnlyList<ScanMetric> competitorMetrics,
        int totalAnswers)
    {
        int IntOrZero(string name) =>
            (int)(competitorMetrics.FirstOrDefault(r => r.MetricName == name)?.MetricValue ?? 0);

        var mentionCount = IntOrZero(MetricNames.MentionCount);
        var recCount = IntOrZero(MetricNames.RecommendationCount);
        double? mentionRate = totalAnswers > 0 ? (double)mentionCount / totalAnswers : null;
        double? recRate = mentionCount > 0 ? (double)recCount / mentionCount : null;

        var rows = new (string Name, double? Value)[]
        {
            (MetricNames.MentionCount, mentionCount),
            (MetricNames.RecommendationCount, recCount),
            (TrendMetrics.MentionRate, mentionRate),
            (TrendMetrics.RecommendationRate, recRate),
        };
        foreach (var (name, value) in rows)
        {
            _db.TrendPoints.Add(NewPoint(trackerId, scanRunId, TrendEntityType.Competitor, competitorId,
                name, value, null, capturedAt, now));
        }
    }

    private static TrendPoint NewPoint(
        Guid trackerId, Guid scanRunId, TrendEntityType entityType, Guid entityId,
        string metricName, double? numericValue, string? categoricalValue,
        DateTime capturedAt, DateTime now) => new()
    {
        Id = Guid.NewGuid(),
        TrackerConfigurationId = trackerId,
        ScanRunId = scanRunId,
        EntityType = entityType,
        EntityId = entityId,
        MetricName = metricName,
        NumericValue = numericValue,
        CategoricalValue = categoricalValue,
        CapturedAt = capturedAt,
        CreatedAt = now,
    };

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

