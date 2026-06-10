using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Sources;

public class GetWorkspaceDomainsQueryHandler
    : IRequestHandler<GetWorkspaceDomainsQuery, WorkspaceDomainsDto>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetWorkspaceDomainsQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<WorkspaceDomainsDto> Handle(
        GetWorkspaceDomainsQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        // Workspace's brands → trackers (intersected with request filter).
        var brandIds = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);
        if (brandIds.Count == 0)
        {
            return new WorkspaceDomainsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspaceDomainRowDto>());
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
            return new WorkspaceDomainsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspaceDomainRowDto>());
        }

        // Scans + scan-completion-times in window.
        var scansInWindow = await _db.ScanRuns.AsNoTracking()
            .Where(s => trackerIds.Contains(s.TrackerConfigurationId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo)
            .Select(s => new { s.Id, CompletedAt = s.CompletedAt ?? s.StartedAt })
            .ToListAsync(cancellationToken);
        if (scansInWindow.Count == 0)
        {
            return new WorkspaceDomainsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspaceDomainRowDto>());
        }
        var scanIdSet = scansInWindow.Select(s => s.Id).ToHashSet();
        var scanCompletedAt = scansInWindow.ToDictionary(s => s.Id, s => s.CompletedAt);

        // Citations whose answers belong to in-window scans. Group by
        // SourceId and project counts + the citing-scan-id set.
        // PromptRuns join: Citation → AIAnswer → PromptRun → ScanRun.
        var citationFacts = await (
            from c in _db.Citations.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on c.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            where scanIdSet.Contains(pr.ScanRunId)
            select new { c.SourceId, pr.ScanRunId }
        ).ToListAsync(cancellationToken);

        if (citationFacts.Count == 0)
        {
            return new WorkspaceDomainsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspaceDomainRowDto>());
        }

        // Aggregate per Source.
        var aggBySource = citationFacts
            .GroupBy(x => x.SourceId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var citingScanIds = g.Select(x => x.ScanRunId).Distinct().ToList();
                    var lastSeen = citingScanIds
                        .Select(id => scanCompletedAt.TryGetValue(id, out var t) ? (DateTime?)t : null)
                        .Where(t => t.HasValue)
                        .Max();
                    return new
                    {
                        CitationCount = g.Count(),
                        RetrievedInScans = citingScanIds.Count,
                        LastSeenAt = lastSeen,
                    };
                });

        var sourceIds = aggBySource.Keys.ToList();

        // Pull the Source rows for naming + authority score.
        var sources = await _db.Sources.AsNoTracking()
            .Where(s => sourceIds.Contains(s.Id))
            .Select(s => new
            {
                s.Id,
                s.SourceName,
                s.NormalizedDomain,
                s.AuthorityScore,
            })
            .ToListAsync(cancellationToken);

        // BrandSourceClassifications for the workspace's brands. A single
        // Source can have a different SourceType per brand — pick the
        // dominant classification (highest count). Falls back to "Unknown"
        // when none exists.
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

        var rows = sources
            .Select(s =>
            {
                var agg = aggBySource[s.Id];
                var sourceType = dominantTypeBySource.TryGetValue(s.Id, out var t) ? t : SourceType.Unknown.ToString();
                return new WorkspaceDomainRowDto(
                    SourceId: s.Id,
                    SourceName: s.SourceName,
                    NormalizedDomain: s.NormalizedDomain,
                    SourceType: sourceType,
                    AuthorityScore: s.AuthorityScore,
                    CitationCount: agg.CitationCount,
                    RetrievedInScans: agg.RetrievedInScans,
                    LastSeenAt: agg.LastSeenAt);
            })
            .OrderByDescending(r => r.CitationCount)
            .ThenBy(r => r.SourceName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new WorkspaceDomainsDto(workspaceId, windowFrom, windowTo, rows);
    }
}
