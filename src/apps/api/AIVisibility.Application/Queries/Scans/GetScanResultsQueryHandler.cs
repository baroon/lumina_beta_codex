using System.Text.Json;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Scans;

public class GetScanResultsQueryHandler : IRequestHandler<GetScanResultsQuery, ScanResultsDto?>
{
    private readonly IAppDbContext _db;

    public GetScanResultsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanResultsDto?> Handle(GetScanResultsQuery request, CancellationToken cancellationToken)
    {
        // Summary needs ScanRun + TrackerConfiguration + Brand in one shot.
        var scan = await _db.ScanRuns
            .AsNoTracking()
            .Include(s => s.TrackerConfiguration)
                .ThenInclude(t => t.Brand)
            .FirstOrDefaultAsync(s => s.Id == request.ScanRunId, cancellationToken);
        if (scan == null) return null;

        var analysisJob = await _db.AnalysisJobs.AsNoTracking()
            .FirstOrDefaultAsync(j => j.ScanRunId == scan.Id, cancellationToken);
        if (analysisJob == null) return null;

        var platforms = await (
            from tp in _db.TrackerPlatforms
            join p in _db.AIPlatforms on tp.AIPlatformId equals p.Id
            where tp.TrackerConfigurationId == scan.TrackerConfigurationId
            orderby p.DisplayOrder
            select new PlatformDto(p.Id, p.Code, p.Name)
        ).AsNoTracking().ToListAsync(cancellationToken);

        var metrics = await _db.ScanMetrics.AsNoTracking()
            .Where(m => m.ScanRunId == scan.Id)
            .ToListAsync(cancellationToken);

        var summary = new ScanSummaryDto(
            scan.TrackerConfigurationId,
            scan.TrackerConfiguration.Name,
            scan.TrackerConfiguration.BrandId,
            scan.TrackerConfiguration.Brand.Name,
            scan.StartedAt,
            scan.CompletedAt,
            scan.Status.ToString(),
            analysisJob.Status.ToString(),
            analysisJob.ErrorMessage,
            scan.ScanCheckCount,
            scan.CompletedCount,
            scan.FailedCount,
            platforms);

        var coreMetrics = BuildCoreMetrics(metrics);
        var breakdowns = await BuildBreakdownsAsync(scan.TrackerConfigurationId, metrics, cancellationToken);

        return new ScanResultsDto(scan.Id, summary, coreMetrics, breakdowns);
    }

    // ------------------------------------------------------------------
    // Core metrics — Overall scope only
    // ------------------------------------------------------------------

    private static CoreMetricsDto BuildCoreMetrics(IReadOnlyList<ScanMetric> all)
    {
        var overall = all.Where(m => m.Scope == ScanMetricScope.Overall).ToList();

        var sentimentDist = overall
            .Where(m => m.MetricName == "BrandSentimentDistribution")
            .ToDictionary(
                m => ReadSentimentValue(m.MetadataJson),
                m => (int)Math.Round(m.MetricValue));

        var topCited = overall
            .Where(m => m.MetricName == "TopCitedSource")
            .Select(m => ReadTopCitedSource(m.MetadataJson, m.MetricValue))
            .Where(d => d is not null).Select(d => d!)
            .OrderBy(d => d.Rank)
            .ToList();

        var topAttributes = overall
            .Where(m => m.MetricName == MetricNames.BrandTopAttribute)
            .Select(m => ReadBrandAttribute(m.MetadataJson, m.MetricValue))
            .Where(d => d is not null).Select(d => d!)
            .OrderBy(d => d.Rank)
            .ToList();

        return new CoreMetricsDto(
            BrandMentionRate: ReadDoubleOrNull(overall, "BrandMentionRate"),
            BrandRecommendationRate: ReadDoubleOrNull(overall, "BrandRecommendationRate"),
            BrandShareOfVoice: ReadDoubleOrNull(overall, "BrandShareOfVoice"),
            AverageBrandRank: ReadDoubleOrNull(overall, "AverageBrandRank"),
            BrandFirstMentionRate: ReadDoubleOrNull(overall, MetricNames.BrandFirstMentionRate),
            AverageBrandRankUniverseSize: ReadDoubleOrNull(overall, MetricNames.AverageBrandRankUniverseSize),
            BrandRecommendationScore: ReadDoubleOrNull(overall, MetricNames.BrandRecommendationScore),
            BrandRecommendationShare: ReadDoubleOrNull(overall, MetricNames.BrandRecommendationShare),
            BrandAbsenceRate: ReadDoubleOrNull(overall, MetricNames.BrandAbsenceRate),
            AverageAnswerCertainty: ReadDoubleOrNull(overall, MetricNames.AverageAnswerCertainty),
            BrandTopRecommendationShare: ReadDoubleOrNull(overall, MetricNames.BrandTopRecommendationShare),
            AverageBrandRecommendationPosition: ReadDoubleOrNull(overall, MetricNames.AverageBrandRecommendationPosition),
            BrandRiskFlagCount: ReadIntOrZero(overall, MetricNames.BrandRiskFlagCount),
            BrandWinningComparisonCount: ReadIntOrZero(overall, MetricNames.BrandWinningComparisonCount),
            BrandLosingComparisonCount: ReadIntOrZero(overall, MetricNames.BrandLosingComparisonCount),
            BrandRecommendedForCount: ReadIntOrZero(overall, MetricNames.BrandRecommendedForCount),
            BrandWithCaveatsCount: ReadIntOrZero(overall, MetricNames.BrandWithCaveatsCount),
            BrandMentionRateMomentum: ReadDoubleOrNull(overall, MetricNames.BrandMentionRateMomentum),
            BrandShareOfVoiceMomentum: ReadDoubleOrNull(overall, MetricNames.BrandShareOfVoiceMomentum),
            BrandAbsenceRateMomentum: ReadDoubleOrNull(overall, MetricNames.BrandAbsenceRateMomentum),
            CompetitorMentionCount: ReadIntOrZero(overall, "CompetitorMentionCount"),
            ProductMentionCount: ReadIntOrZero(overall, "ProductMentionCount"),
            CitationCount: ReadIntOrZero(overall, "CitationCount"),
            OwnedCitationCount: ReadIntOrZero(overall, "OwnedCitationCount"),
            CompetitorCitationCount: ReadIntOrZero(overall, "CompetitorCitationCount"),
            ThirdPartyCitationCount: ReadIntOrZero(overall, "ThirdPartyCitationCount"),
            UnknownCitationCount: ReadIntOrZero(overall, "UnknownCitationCount"),
            BrandSentimentDistribution: sentimentDist,
            TopCitedSources: topCited,
            TopBrandAttributes: topAttributes);
    }

    // ------------------------------------------------------------------
    // Breakdowns — Platform / Lens / Topic / Competitor
    // ------------------------------------------------------------------

    private async Task<BreakdownsDto> BuildBreakdownsAsync(
        Guid trackerId,
        IReadOnlyList<ScanMetric> metrics,
        CancellationToken ct)
    {
        // Pre-fetch name lookups for the IDs we actually saw at each scope —
        // avoids loading every Lens / Topic / Competitor / Platform row.
        var platformIds = DistinctScopeIds(metrics, ScanMetricScope.Platform);
        var platforms = await _db.AIPlatforms.AsNoTracking()
            .Where(p => platformIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        var lensIds = DistinctScopeIds(metrics, ScanMetricScope.Lens);
        var lenses = await _db.Lenses.AsNoTracking()
            .Where(l => lensIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name, ct);

        var topicIds = DistinctScopeIds(metrics, ScanMetricScope.Topic);
        var topics = await _db.Topics.AsNoTracking()
            .Where(t => topicIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name, ct);

        // Competitor scope: include every tracked competitor (with 0 counts
        // when absent), not just mentioned ones — frontend may want to show
        // "tracked but not mentioned" entries explicitly.
        var trackedCompetitorIds = await _db.TrackerCompetitors.AsNoTracking()
            .Where(tc => tc.TrackerConfigurationId == trackerId)
            .Select(tc => tc.CompetitorId)
            .ToListAsync(ct);
        var competitors = await _db.Competitors.AsNoTracking()
            .Where(c => trackedCompetitorIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        return new BreakdownsDto(
            ByPlatform: BuildPlatformRows(metrics, platforms),
            ByLens: BuildLensRows(metrics, lenses),
            ByTopic: BuildTopicRows(metrics, topics),
            ByCompetitor: BuildCompetitorRows(metrics, competitors));
    }

    private static List<Guid> DistinctScopeIds(IReadOnlyList<ScanMetric> metrics, ScanMetricScope scope) =>
        metrics.Where(m => m.Scope == scope && m.ScopeId.HasValue)
            .Select(m => m.ScopeId!.Value)
            .Distinct()
            .ToList();

    private static IReadOnlyList<PlatformBreakdownDto> BuildPlatformRows(
        IReadOnlyList<ScanMetric> metrics, IReadOnlyDictionary<Guid, string> names)
    {
        return GroupByScope(metrics, ScanMetricScope.Platform)
            .Where(g => names.ContainsKey(g.Key))
            .OrderBy(g => names[g.Key])
            .Select(g => new PlatformBreakdownDto(
                g.Key,
                names[g.Key],
                BrandMentionRate: ReadDoubleOrNull(g.Value, "BrandMentionRate"),
                BrandRecommendationRate: ReadDoubleOrNull(g.Value, "BrandRecommendationRate"),
                BrandShareOfVoice: ReadDoubleOrNull(g.Value, "BrandShareOfVoice"),
                CitationCount: ReadIntOrZero(g.Value, "CitationCount"),
                BrandSentimentDistribution: ReadSentimentDistribution(g.Value)))
            .ToList();
    }

    private static IReadOnlyList<LensBreakdownDto> BuildLensRows(
        IReadOnlyList<ScanMetric> metrics, IReadOnlyDictionary<Guid, string> names)
    {
        return GroupByScope(metrics, ScanMetricScope.Lens)
            .Where(g => names.ContainsKey(g.Key))
            .OrderBy(g => names[g.Key])
            .Select(g => new LensBreakdownDto(
                g.Key,
                names[g.Key],
                BrandMentionRate: ReadDoubleOrNull(g.Value, "BrandMentionRate"),
                BrandRecommendationRate: ReadDoubleOrNull(g.Value, "BrandRecommendationRate"),
                BrandShareOfVoice: ReadDoubleOrNull(g.Value, "BrandShareOfVoice"),
                CitationCount: ReadIntOrZero(g.Value, "CitationCount"),
                BrandSentimentDistribution: ReadSentimentDistribution(g.Value)))
            .ToList();
    }

    private static IReadOnlyList<TopicBreakdownDto> BuildTopicRows(
        IReadOnlyList<ScanMetric> metrics, IReadOnlyDictionary<Guid, string> names)
    {
        return GroupByScope(metrics, ScanMetricScope.Topic)
            .Where(g => names.ContainsKey(g.Key))
            .OrderBy(g => names[g.Key])
            .Select(g => new TopicBreakdownDto(
                g.Key,
                names[g.Key],
                BrandMentionRate: ReadDoubleOrNull(g.Value, "BrandMentionRate"),
                BrandRecommendationRate: ReadDoubleOrNull(g.Value, "BrandRecommendationRate"),
                BrandShareOfVoice: ReadDoubleOrNull(g.Value, "BrandShareOfVoice"),
                CitationCount: ReadIntOrZero(g.Value, "CitationCount")))
            .ToList();
    }

    private static IReadOnlyList<CompetitorBreakdownDto> BuildCompetitorRows(
        IReadOnlyList<ScanMetric> metrics, IReadOnlyDictionary<Guid, string> competitors)
    {
        var byId = GroupByScope(metrics, ScanMetricScope.Competitor)
            .ToDictionary(g => g.Key, g => g.Value);

        return competitors
            .OrderBy(kv => kv.Value)
            .Select(kv =>
            {
                byId.TryGetValue(kv.Key, out var rows);
                rows ??= new List<ScanMetric>();
                return new CompetitorBreakdownDto(
                    kv.Key,
                    kv.Value,
                    MentionCount: ReadIntOrZero(rows, "MentionCount"),
                    RecommendationCount: ReadIntOrZero(rows, "RecommendationCount"),
                    ShareOfVoice: ReadDoubleOrNull(rows, MetricNames.CompetitorShareOfVoice),
                    RecommendationShare: ReadDoubleOrNull(rows, MetricNames.CompetitorRecommendationShare));
            })
            .ToList();
    }

    private static IEnumerable<KeyValuePair<Guid, IReadOnlyList<ScanMetric>>> GroupByScope(
        IReadOnlyList<ScanMetric> metrics, ScanMetricScope scope)
    {
        return metrics
            .Where(m => m.Scope == scope && m.ScopeId.HasValue)
            .GroupBy(m => m.ScopeId!.Value)
            .Select(g => new KeyValuePair<Guid, IReadOnlyList<ScanMetric>>(g.Key, g.ToList()));
    }

    private static IReadOnlyDictionary<string, int> ReadSentimentDistribution(IReadOnlyList<ScanMetric> rows) =>
        rows.Where(m => m.MetricName == "BrandSentimentDistribution")
            .ToDictionary(
                m => ReadSentimentValue(m.MetadataJson),
                m => (int)Math.Round(m.MetricValue));

    // ------------------------------------------------------------------
    // Primitive value readers
    // ------------------------------------------------------------------

    private static double? ReadDoubleOrNull(IReadOnlyList<ScanMetric> rows, string name)
    {
        var row = rows.FirstOrDefault(m => m.MetricName == name);
        return row?.MetricValue;
    }

    private static int ReadIntOrZero(IReadOnlyList<ScanMetric> rows, string name)
    {
        var row = rows.FirstOrDefault(m => m.MetricName == name);
        return row is null ? 0 : (int)Math.Round(row.MetricValue);
    }

    private static string ReadSentimentValue(string? metadataJson)
    {
        if (string.IsNullOrEmpty(metadataJson)) return "Unknown";
        using var doc = JsonDocument.Parse(metadataJson);
        return doc.RootElement.TryGetProperty("value", out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString() ?? "Unknown"
            : "Unknown";
    }

    private static TopCitedSourceDto? ReadTopCitedSource(string? metadataJson, double metricValue)
    {
        if (string.IsNullOrEmpty(metadataJson)) return null;
        using var doc = JsonDocument.Parse(metadataJson);
        var root = doc.RootElement;
        if (!root.TryGetProperty("source_name", out var nameProp) || nameProp.ValueKind != JsonValueKind.String) return null;
        if (!root.TryGetProperty("rank", out var rankProp) || rankProp.ValueKind != JsonValueKind.Number) return null;
        return new TopCitedSourceDto(rankProp.GetInt32(), nameProp.GetString()!, (int)Math.Round(metricValue));
    }

    private static BrandAttributeDto? ReadBrandAttribute(string? metadataJson, double metricValue)
    {
        if (string.IsNullOrEmpty(metadataJson)) return null;
        using var doc = JsonDocument.Parse(metadataJson);
        var root = doc.RootElement;
        if (!root.TryGetProperty("attribute", out var nameProp) || nameProp.ValueKind != JsonValueKind.String) return null;
        if (!root.TryGetProperty("polarity", out var polarityProp) || polarityProp.ValueKind != JsonValueKind.String) return null;
        if (!root.TryGetProperty("rank", out var rankProp) || rankProp.ValueKind != JsonValueKind.Number) return null;
        return new BrandAttributeDto(
            rankProp.GetInt32(),
            nameProp.GetString()!,
            polarityProp.GetString()!,
            (int)Math.Round(metricValue));
    }
}
