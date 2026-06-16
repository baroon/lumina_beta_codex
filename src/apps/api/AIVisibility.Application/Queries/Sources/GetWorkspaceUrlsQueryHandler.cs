using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Common;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Sources;

public class GetWorkspaceUrlsQueryHandler
    : IRequestHandler<GetWorkspaceUrlsQuery, WorkspaceUrlsDto>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetWorkspaceUrlsQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<WorkspaceUrlsDto> Handle(
        GetWorkspaceUrlsQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        // Workspace scope resolution — same pattern as the domains handler.
        var brandIds = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);
        if (brandIds.Count == 0)
        {
            return new WorkspaceUrlsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspaceUrlRowDto>());
        }
        var brandIdSet = brandIds.ToHashSet();

        var trackerIds = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => brandIdSet.Contains(t.BrandId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        if (request.TrackerIds is { Count: > 0 })
        {
            var requested = new HashSet<Guid>(request.TrackerIds);
            trackerIds = trackerIds.Where(id => requested.Contains(id)).ToList();
        }
        if (trackerIds.Count == 0)
        {
            return new WorkspaceUrlsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspaceUrlRowDto>());
        }

        var scansInWindow = await _db.ScanRuns.AsNoTracking()
            .Where(s => trackerIds.Contains(s.TrackerConfigurationId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo)
            .Select(s => new { s.Id, CompletedAt = s.CompletedAt ?? s.StartedAt })
            .ToListAsync(cancellationToken);
        if (scansInWindow.Count == 0)
        {
            return new WorkspaceUrlsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspaceUrlRowDto>());
        }
        var scanIdSet = scansInWindow.Select(s => s.Id).ToHashSet();
        var scanCompletedAt = scansInWindow.ToDictionary(s => s.Id, s => s.CompletedAt);

        // Same canonical-filter resolution + EXISTS pattern as the
        // domains handler. See that file for semantics.
        var lensIdFilter = await FilterResolvers.ResolveLensIdSetAsync(_db, request.LensCodes, cancellationToken);
        var topicIdFilter = await FilterResolvers.ResolveTopicIdSetAsync(_db, workspaceId, request.TopicNames, cancellationToken);
        var productIdFilter = await FilterResolvers.ResolveProductIdSetAsync(_db, workspaceId, request.ProductNames, cancellationToken);
        var marketIdFilter = await FilterResolvers.ResolveMarketIdSetAsync(_db, workspaceId, request.MarketNames, cancellationToken);
        var audienceIdFilter = await FilterResolvers.ResolveAudienceIdSetAsync(_db, workspaceId, request.AudienceNames, cancellationToken);
        var sentimentFilter = FilterResolvers.ResolveSentimentSet(request.SentimentValues);
        var platformIdFilter = await FilterResolvers.ResolvePlatformIdSetAsync(_db, request.PlatformCodes, cancellationToken);

        // Citations whose answers landed in window AND that point at a
        // specific SourceUrl (mentioned-source citations without URL skip
        // this page — they're on /sources/domains only).
        var citationFacts = await (
            from c in _db.Citations.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on c.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            where scanIdSet.Contains(pr.ScanRunId) && c.SourceUrlId != null
                && (lensIdFilter == null
                    || _db.Prompts.Any(p => p.Id == pr.PromptId && lensIdFilter.Contains(p.LensId)))
                && (topicIdFilter == null
                    || _db.PromptTopics.Any(pt => pt.PromptId == pr.PromptId && topicIdFilter.Contains(pt.TopicId)))
                && (productIdFilter == null
                    || _db.PromptProducts.Any(pp => pp.PromptId == pr.PromptId && productIdFilter.Contains(pp.ProductId)))
                && (marketIdFilter == null
                    || _db.PromptMarkets.Any(pm => pm.PromptId == pr.PromptId && marketIdFilter.Contains(pm.MarketId)))
                && (audienceIdFilter == null
                    || _db.PromptAudiences.Any(pa => pa.PromptId == pr.PromptId && audienceIdFilter.Contains(pa.AudienceId)))
                && (platformIdFilter == null || platformIdFilter.Contains(pr.AIPlatformId))
                && (sentimentFilter == null
                    || _db.Mentions.Any(m => m.AIAnswerId == a.Id
                        && m.EntityType == MentionEntityType.Brand
                        && sentimentFilter.Contains(m.Sentiment)))
            select new { SourceUrlId = c.SourceUrlId!.Value, c.SourceId, pr.ScanRunId }
        ).ToListAsync(cancellationToken);

        if (citationFacts.Count == 0)
        {
            return new WorkspaceUrlsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspaceUrlRowDto>());
        }

        var aggByUrl = citationFacts
            .GroupBy(x => x.SourceUrlId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var scanIds = g.Select(x => x.ScanRunId).Distinct().ToList();
                    var lastSeen = scanIds
                        .Select(id => scanCompletedAt.TryGetValue(id, out var t) ? (DateTime?)t : null)
                        .Where(t => t.HasValue)
                        .Max();
                    return new
                    {
                        SourceId = g.First().SourceId,
                        CitationCount = g.Count(),
                        RetrievedInScans = scanIds.Count,
                        LastSeenAt = lastSeen,
                    };
                });

        var sourceUrlIds = aggByUrl.Keys.ToList();

        var urls = await _db.SourceUrls.AsNoTracking()
            .Where(su => sourceUrlIds.Contains(su.Id))
            .Select(su => new
            {
                su.Id,
                su.Url,
                su.NormalizedUrl,
                su.Title,
                su.SourceId,
            })
            .ToListAsync(cancellationToken);

        var sourceIds = urls.Select(u => u.SourceId).Distinct().ToList();
        var sources = await _db.Sources.AsNoTracking()
            .Where(s => sourceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => new { s.SourceName, s.NormalizedDomain }, cancellationToken);

        // Same dominant-classification approach as the domains handler —
        // a source can have different SourceTypes per brand; we pick the
        // most common across the workspace's brand classifications.
        var classifications = await _db.BrandSourceClassifications.AsNoTracking()
            .Where(bsc => sourceIds.Contains(bsc.SourceId) && brandIdSet.Contains(bsc.BrandId))
            .Select(bsc => new { bsc.SourceId, bsc.SourceType })
            .ToListAsync(cancellationToken);
        var dominantTypeBySource = classifications
            .GroupBy(c => c.SourceId)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(x => x.SourceType)
                      .OrderByDescending(typeGroup => typeGroup.Count())
                      .First()
                      .Key
                      .ToString());

        var rows = urls
            .Select(u =>
            {
                var agg = aggByUrl[u.Id];
                var source = sources.TryGetValue(u.SourceId, out var s) ? s : null;
                var sourceType = dominantTypeBySource.TryGetValue(u.SourceId, out var t) ? t : SourceType.Unknown.ToString();
                return new WorkspaceUrlRowDto(
                    SourceUrlId: u.Id,
                    Url: u.Url,
                    NormalizedUrl: u.NormalizedUrl,
                    Title: u.Title,
                    SourceId: u.SourceId,
                    SourceName: source?.SourceName ?? "(unknown)",
                    NormalizedDomain: source?.NormalizedDomain,
                    SourceType: sourceType,
                    CitationCount: agg.CitationCount,
                    RetrievedInScans: agg.RetrievedInScans,
                    LastSeenAt: agg.LastSeenAt);
            })
            .OrderByDescending(r => r.CitationCount)
            .ThenBy(r => r.Url, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new WorkspaceUrlsDto(workspaceId, windowFrom, windowTo, rows);
    }
}
