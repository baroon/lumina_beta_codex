using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Sources;

public class GetScanSourcesQueryHandler : IRequestHandler<GetScanSourcesQuery, ScanSourcesDto?>
{
    private readonly IAppDbContext _db;

    public GetScanSourcesQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanSourcesDto?> Handle(GetScanSourcesQuery request, CancellationToken cancellationToken)
    {
        // Resolve scan → tracker → brand so the classifications query is brand-scoped.
        var scan = await _db.ScanRuns.AsNoTracking()
            .Where(s => s.Id == request.ScanRunId)
            .Select(s => new { s.Id, s.TrackerConfigurationId, s.TrackerConfiguration.BrandId })
            .FirstOrDefaultAsync(cancellationToken);
        if (scan == null) return null;

        // All AIAnswer ids for this scan (one trip — used both for the citation
        // filter and the per-source platform aggregation).
        var promptRunMap = await _db.PromptRuns.AsNoTracking()
            .Where(pr => pr.ScanRunId == scan.Id)
            .Select(pr => new { pr.Id, pr.AIPlatformId })
            .ToListAsync(cancellationToken);
        if (promptRunMap.Count == 0)
        {
            return new ScanSourcesDto(scan.Id, scan.BrandId, Array.Empty<SourceListItemDto>());
        }
        var promptRunIds = promptRunMap.Select(pr => pr.Id).ToHashSet();
        var platformByPromptRun = promptRunMap.ToDictionary(pr => pr.Id, pr => pr.AIPlatformId);

        // AIAnswer.PromptRunId tells us which platform an answer (and its
        // citations) came from. Build the platform lookup per AIAnswer once so
        // the per-source aggregation doesn't re-query.
        var answers = await _db.AIAnswers.AsNoTracking()
            .Where(a => promptRunIds.Contains(a.PromptRunId))
            .Select(a => new { a.Id, a.PromptRunId })
            .ToListAsync(cancellationToken);
        var platformByAnswer = answers.ToDictionary(
            a => a.Id, a => platformByPromptRun[a.PromptRunId]);

        var answerIds = answers.Select(a => a.Id).ToHashSet();
        var citations = await _db.Citations.AsNoTracking()
            .Where(c => answerIds.Contains(c.AIAnswerId))
            .Select(c => new { c.SourceId, c.AIAnswerId })
            .ToListAsync(cancellationToken);
        if (citations.Count == 0)
        {
            return new ScanSourcesDto(scan.Id, scan.BrandId, Array.Empty<SourceListItemDto>());
        }

        var sourceIds = citations.Select(c => c.SourceId).Distinct().ToList();
        var sources = await _db.Sources.AsNoTracking()
            .Where(s => sourceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s, cancellationToken);

        var classifications = await _db.BrandSourceClassifications.AsNoTracking()
            .Where(c => c.BrandId == scan.BrandId && sourceIds.Contains(c.SourceId))
            .ToDictionaryAsync(c => c.SourceId, c => c, cancellationToken);

        // Platform lookup for the platform-name display (the per-citation
        // platform ids are still raw guids at this point).
        var platformIds = platformByAnswer.Values.Distinct().ToList();
        var platforms = await _db.AIPlatforms.AsNoTracking()
            .Where(p => platformIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p, cancellationToken);

        // Per-source aggregation: citation count + distinct platforms.
        var bySource = citations
            .GroupBy(c => c.SourceId)
            .Select(g =>
            {
                var sourceId = g.Key;
                if (!sources.TryGetValue(sourceId, out var source)) return null;

                var distinctPlatformIds = g
                    .Select(c => platformByAnswer.TryGetValue(c.AIAnswerId, out var pid) ? (Guid?)pid : null)
                    .Where(pid => pid is not null)
                    .Select(pid => pid!.Value)
                    .Distinct()
                    .ToList();
                var sourcePlatforms = distinctPlatformIds
                    .Select(pid => platforms.TryGetValue(pid, out var p)
                        ? new SourcePlatformDto(p.Id, p.Code, p.Name)
                        : null)
                    .Where(p => p is not null)
                    .Select(p => p!)
                    .OrderBy(p => p.Name)
                    .ToList();

                // Classification may be missing if the persistence pipeline
                // never ran for this brand+source — surface that as Unknown
                // rather than 500ing the whole list.
                classifications.TryGetValue(sourceId, out var classification);

                return new SourceListItemDto(
                    SourceId: sourceId,
                    SourceName: source.SourceName,
                    Domain: source.NormalizedDomain,
                    NormalizedDomain: source.NormalizedDomain,
                    SourceType: classification?.SourceType.ToString() ?? "Unknown",
                    Status: classification?.Status.ToString() ?? "Unknown",
                    ProvenanceSource: classification?.ProvenanceSource.ToString() ?? "RuleBased",
                    ConfidenceScore: classification?.ConfidenceScore ?? 0.0,
                    CitationCount: g.Count(),
                    Platforms: sourcePlatforms);
            })
            .Where(item => item is not null)
            .Select(item => item!)
            // D10 sort: citation count desc, then source name asc for stable display.
            .OrderByDescending(item => item.CitationCount)
            .ThenBy(item => item.SourceName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new ScanSourcesDto(scan.Id, scan.BrandId, bySource);
    }
}
