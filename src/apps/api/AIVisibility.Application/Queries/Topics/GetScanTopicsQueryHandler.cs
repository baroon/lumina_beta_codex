using System.Text.Json;
using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Topics;

public class GetScanTopicsQueryHandler : IRequestHandler<GetScanTopicsQuery, ScanTopicsDto?>
{
    private readonly IAppDbContext _db;

    public GetScanTopicsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanTopicsDto?> Handle(GetScanTopicsQuery request, CancellationToken cancellationToken)
    {
        var scanExists = await _db.ScanRuns.AsNoTracking()
            .AnyAsync(s => s.Id == request.ScanRunId, cancellationToken);
        if (!scanExists) return null;

        // Topic-scope metric rows produced by MetricAggregator. ScopeId is the
        // Topic.Id — group by it so each topic gets its full metric set.
        var topicMetrics = await _db.ScanMetrics.AsNoTracking()
            .Where(m => m.ScanRunId == request.ScanRunId && m.Scope == ScanMetricScope.Topic)
            .ToListAsync(cancellationToken);

        if (topicMetrics.Count == 0)
        {
            return new ScanTopicsDto(request.ScanRunId, Array.Empty<TopicListItemDto>());
        }

        var topicIds = topicMetrics
            .Where(m => m.ScopeId.HasValue)
            .Select(m => m.ScopeId!.Value)
            .Distinct()
            .ToList();

        var topicNames = await _db.Topics.AsNoTracking()
            .Where(t => topicIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name, cancellationToken);

        var rows = topicMetrics
            .Where(m => m.ScopeId.HasValue)
            .GroupBy(m => m.ScopeId!.Value)
            .Select(g => BuildRow(g.Key, g.ToList(), topicNames))
            .Where(r => r is not null)
            .Select(r => r!)
            // Default sort: ownership score desc so the user lands first on
            // topics they own. Tie-breakers: citation count desc, then
            // topic name asc.
            .OrderByDescending(r => r.OwnershipScore)
            .ThenByDescending(r => r.CitationCount)
            .ThenBy(r => r.TopicName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new ScanTopicsDto(request.ScanRunId, rows);
    }

    /// <summary>
    /// Categorise the ownership score into 3 display bands. Equal-width
    /// thresholds: 0.66+ is owned, 0.33–0.66 contested, &lt; 0.33 lost.
    /// </summary>
    private static string BandFor(double score) => score switch
    {
        >= 0.66 => "Owned",
        >= 0.33 => "Contested",
        _ => "Lost",
    };

    private static TopicListItemDto? BuildRow(Guid topicId, List<ScanMetric> rows, IReadOnlyDictionary<Guid, string> topicNames)
    {
        if (!topicNames.TryGetValue(topicId, out var topicName))
        {
            // Topic was deleted after metrics were computed — skip rather than
            // surface an "Unknown" topic the user can't act on.
            return null;
        }

        double? Single(string name) => rows.FirstOrDefault(r => r.MetricName == name)?.MetricValue;
        int IntOrZero(string name) => (int)(Single(name) ?? 0);

        var citationCount = IntOrZero(MetricNames.CitationCount);
        var ownedCount = IntOrZero(MetricNames.OwnedCitationCount);
        double? ownedShare = citationCount > 0 ? (double)ownedCount / citationCount : null;

        // Sentiment distribution is multiple metric rows of the same name,
        // each row's metadata_json carrying the sentiment value. The mode is
        // the row with the highest metric_value.
        var sentimentMode = rows
            .Where(r => r.MetricName == MetricNames.BrandSentimentDistribution && r.MetadataJson != null)
            .OrderByDescending(r => r.MetricValue)
            .Select(r => ReadSentimentValue(r.MetadataJson!))
            .FirstOrDefault(s => s is not null);

        var brandMentionRate = Single(MetricNames.BrandMentionRate);
        var ownershipScore = brandMentionRate ?? 0.0;
        return new TopicListItemDto(
            TopicId: topicId,
            TopicName: topicName,
            BrandMentionRate: brandMentionRate,
            BrandRecommendationRate: Single(MetricNames.BrandRecommendationRate),
            BrandShareOfVoice: Single(MetricNames.BrandShareOfVoice),
            AverageBrandRank: Single(MetricNames.AverageBrandRank),
            CitationCount: citationCount,
            OwnedCitationShare: ownedShare,
            DominantSentiment: sentimentMode,
            OwnershipScore: ownershipScore,
            OwnershipBand: BandFor(ownershipScore));
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
