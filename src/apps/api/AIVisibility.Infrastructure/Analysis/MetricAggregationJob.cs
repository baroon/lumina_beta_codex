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

            // Phase 4 Slice 6 trend points: denormalize the dashboard-relevant
            // Overall-scope metrics into trend_points so the Visibility Tracker
            // dashboard can window across scans without re-aggregating.
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
    // Trend point denormalization (Phase 4 Slice 6)
    // -----------------------------------------------------------------

    /// <summary>
    /// Captures one TrendPoint per dashboard metric so the Visibility Tracker
    /// dashboard can window across scans without re-aggregating. Derives:
    /// the 4 Overall-scope rates + AverageBrandRank directly, OwnedCitationShare
    /// from owned/total counts, OverallSentiment from the mode of
    /// BrandSentimentDistribution rows.
    /// </summary>
    private async Task WriteTrendPointsAsync(
        Guid scanRunId, IReadOnlyList<ScanMetric> rows, CancellationToken ct)
    {
        var scan = await _db.ScanRuns.AsNoTracking()
            .Where(s => s.Id == scanRunId)
            .Select(s => new { s.TrackerConfigurationId, s.StartedAt, s.CompletedAt })
            .FirstOrDefaultAsync(ct);
        if (scan == null) return;

        var capturedAt = scan.CompletedAt ?? scan.StartedAt;
        var trackerId = scan.TrackerConfigurationId;
        var now = DateTime.UtcNow;

        var overall = rows.Where(r => r.Scope == ScanMetricScope.Overall).ToList();
        double? Read(string name) => overall.FirstOrDefault(r => r.MetricName == name)?.MetricValue;
        int IntOrZero(string name) => (int)(Read(name) ?? 0);

        // Numeric trends — null when the source aggregator skipped the metric
        // (denominator-zero etc.).
        var numericTrends = new (string Name, double? Value)[]
        {
            (MetricNames.BrandMentionRate, Read(MetricNames.BrandMentionRate)),
            (MetricNames.BrandRecommendationRate, Read(MetricNames.BrandRecommendationRate)),
            (MetricNames.BrandShareOfVoice, Read(MetricNames.BrandShareOfVoice)),
            (MetricNames.AverageBrandRank, Read(MetricNames.AverageBrandRank)),
        };

        // OwnedCitationShare = owned / total. Null when total is zero.
        var citationCount = IntOrZero(MetricNames.CitationCount);
        var ownedCount = IntOrZero(MetricNames.OwnedCitationCount);
        double? ownedShare = citationCount > 0 ? (double)ownedCount / citationCount : null;

        foreach (var (name, value) in numericTrends.Append(
            (TrendMetrics.OwnedCitationShare, ownedShare)))
        {
            _db.TrendPoints.Add(new TrendPoint
            {
                Id = Guid.NewGuid(),
                TrackerConfigurationId = trackerId,
                ScanRunId = scanRunId,
                MetricName = name,
                NumericValue = value,
                CategoricalValue = null,
                CapturedAt = capturedAt,
                CreatedAt = now,
            });
        }

        // OverallSentiment: mode of the sentiment distribution rows for the
        // Overall scope. Null when no signals had a sentiment.
        var sentimentMode = overall
            .Where(r => r.MetricName == MetricNames.BrandSentimentDistribution && r.MetadataJson != null)
            .OrderByDescending(r => r.MetricValue)
            .Select(r => ReadSentimentValue(r.MetadataJson!))
            .FirstOrDefault(s => s is not null);

        _db.TrendPoints.Add(new TrendPoint
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = trackerId,
            ScanRunId = scanRunId,
            MetricName = TrendMetrics.OverallSentiment,
            NumericValue = null,
            CategoricalValue = sentimentMode,
            CapturedAt = capturedAt,
            CreatedAt = now,
        });
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

/// <summary>
/// Stable metric-name constants for trend rows that aren't direct copies of
/// a <see cref="MetricNames"/> entry (derived values like OwnedCitationShare,
/// or new dashboard-only names like OverallSentiment).
/// </summary>
public static class TrendMetrics
{
    public const string OwnedCitationShare = "OwnedCitationShare";
    public const string OverallSentiment = "OverallSentiment";
}
