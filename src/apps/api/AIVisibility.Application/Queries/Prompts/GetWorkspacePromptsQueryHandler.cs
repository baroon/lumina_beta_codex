using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Prompts;

public class GetWorkspacePromptsQueryHandler
    : IRequestHandler<GetWorkspacePromptsQuery, WorkspacePromptsDto>
{
    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetWorkspacePromptsQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<WorkspacePromptsDto> Handle(
        GetWorkspacePromptsQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        // Tracked brands in workspace.
        var brandIds = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);
        if (brandIds.Count == 0)
        {
            return new WorkspacePromptsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspacePromptRowDto>());
        }

        // Trackers owned by those brands, intersected with the optional
        // request filter — same shape as the overview handler.
        var trackerRows = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => new { t.Id, t.BrandId, t.Name })
            .ToListAsync(cancellationToken);
        if (request.TrackerIds is { Count: > 0 })
        {
            var requested = new HashSet<Guid>(request.TrackerIds);
            trackerRows = trackerRows.Where(t => requested.Contains(t.Id)).ToList();
        }
        if (trackerRows.Count == 0)
        {
            return new WorkspacePromptsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspacePromptRowDto>());
        }
        var trackerIds = trackerRows.Select(t => t.Id).ToList();
        var trackerById = trackerRows.ToDictionary(t => t.Id, t => t);

        // Active prompts across those trackers (Draft prompts are pre-confirmation noise).
        var prompts = await _db.Prompts.AsNoTracking()
            .Where(p => trackerIds.Contains(p.TrackerConfigurationId) && p.Status == PromptStatus.Active)
            .Select(p => new { p.Id, p.PromptText, p.LensId, p.TrackerConfigurationId })
            .ToListAsync(cancellationToken);
        if (prompts.Count == 0)
        {
            return new WorkspacePromptsDto(workspaceId, windowFrom, windowTo, Array.Empty<WorkspacePromptRowDto>());
        }
        var promptIds = prompts.Select(p => p.Id).ToList();

        // Lens names for the prompts we care about.
        var lensIds = prompts.Select(p => p.LensId).Distinct().ToList();
        var lensNameById = await _db.Lenses.AsNoTracking()
            .Where(l => lensIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name, cancellationToken);

        // Brand names for the trackers we care about.
        var brandNameById = await _db.Brands.AsNoTracking()
            .Where(b => brandIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken);

        // PromptTopics → topic names. Many prompts × few topics; pull as one
        // query and group in memory rather than per-prompt round-trips.
        var topicLinks = await (
            from pt in _db.PromptTopics.AsNoTracking()
            join t in _db.Topics.AsNoTracking() on pt.TopicId equals t.Id
            where promptIds.Contains(pt.PromptId)
            select new { pt.PromptId, t.Name }
        ).ToListAsync(cancellationToken);
        var topicsByPrompt = topicLinks
            .GroupBy(x => x.PromptId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Name).Distinct().OrderBy(n => n).ToList());

        // PromptRuns in window → per-prompt scan-count / last-scan / platforms.
        // Inner-join AIPlatform up-front so we have the platform code in one shot.
        var runRows = await (
            from pr in _db.PromptRuns.AsNoTracking()
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join p in _db.AIPlatforms.AsNoTracking() on pr.AIPlatformId equals p.Id
            where promptIds.Contains(pr.PromptId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            select new
            {
                pr.PromptId,
                ScanRunId = s.Id,
                CompletedAt = s.CompletedAt ?? s.StartedAt,
                PlatformCode = p.Code,
            }
        ).ToListAsync(cancellationToken);

        var runAggByPrompt = runRows
            .GroupBy(r => r.PromptId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    ScanCount = g.Select(r => r.ScanRunId).Distinct().Count(),
                    LastScanAt = (DateTime?)g.Max(r => r.CompletedAt),
                    PlatformCodes = g.Select(r => r.PlatformCode).Distinct().OrderBy(c => c).ToList(),
                });

        var rows = prompts
            .Select(p =>
            {
                var tracker = trackerById[p.TrackerConfigurationId];
                var lensName = lensNameById.TryGetValue(p.LensId, out var ln) ? ln : "(unknown)";
                var brandName = brandNameById.TryGetValue(tracker.BrandId, out var bn) ? bn : "(unknown)";
                var topics = topicsByPrompt.TryGetValue(p.Id, out var t) ? t : new List<string>();
                runAggByPrompt.TryGetValue(p.Id, out var agg);
                return new WorkspacePromptRowDto(
                    PromptId: p.Id,
                    Text: p.PromptText,
                    LensId: p.LensId,
                    LensName: lensName,
                    Topics: topics,
                    TrackerId: tracker.Id,
                    TrackerName: tracker.Name,
                    BrandId: tracker.BrandId,
                    BrandName: brandName,
                    ScanCount: agg?.ScanCount ?? 0,
                    LastScanAt: agg?.LastScanAt,
                    PlatformCodes: agg?.PlatformCodes ?? new List<string>());
            })
            .OrderByDescending(r => r.LastScanAt ?? DateTime.MinValue)
            .ThenBy(r => r.Text, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new WorkspacePromptsDto(workspaceId, windowFrom, windowTo, rows);
    }
}
