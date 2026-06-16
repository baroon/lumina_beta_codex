using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Prompts;

public class GetWorkspacePromptsQueryHandler
    : IRequestHandler<GetWorkspacePromptsQuery, WorkspacePromptsDto>
{
    private sealed record BrandMentionFact(
        Guid PromptId,
        Guid AnswerId,
        Guid EntityId,
        Sentiment Sentiment,
        int MentionCount,
        double FirstMentionPosition);


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
            return EmptyResult(workspaceId, windowFrom, windowTo);
        }

        // Trackers owned by those brands, intersected with the optional
        // request filter — same shape as the overview handler. We also
        // load PromptAllocation here so the workspace-wide quota row on
        // /prompts can be aggregated without a follow-up query.
        var trackerRows = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => brandIds.Contains(t.BrandId))
            .Select(t => new { t.Id, t.BrandId, t.Name, t.PromptAllocation })
            .ToListAsync(cancellationToken);
        if (request.TrackerIds is { Count: > 0 })
        {
            var requested = new HashSet<Guid>(request.TrackerIds);
            trackerRows = trackerRows.Where(t => requested.Contains(t.Id)).ToList();
        }
        if (trackerRows.Count == 0)
        {
            return EmptyResult(workspaceId, windowFrom, windowTo);
        }
        var trackerIds = trackerRows.Select(t => t.Id).ToList();
        var trackerById = trackerRows.ToDictionary(t => t.Id, t => t);

        // Active prompts across those trackers (Draft prompts are pre-confirmation noise).
        var prompts = await _db.Prompts.AsNoTracking()
            .Where(p => trackerIds.Contains(p.TrackerConfigurationId) && p.Status == PromptStatus.Active)
            .Select(p => new { p.Id, p.PromptText, p.LensId, p.TrackerConfigurationId })
            .ToListAsync(cancellationToken);

        // Per-tracker active-prompt counts feed both the per-tracker
        // PromptUsed field and the workspace-wide TotalUsed roll-up below.
        // Computed off the unconditioned prompts list (no row drops yet)
        // so empty trackers still show "0 / N" in the picker.
        var usedByTracker = prompts
            .GroupBy(p => p.TrackerConfigurationId)
            .ToDictionary(g => g.Key, g => g.Count());

        // Lens options per in-scope tracker — drives the Add-prompt
        // dialog's dependent lens picker. Single query + group keeps it
        // cheap even with many trackers.
        var trackerLensRows = await (
            from tl in _db.TrackerLenses.AsNoTracking()
            join l in _db.Lenses.AsNoTracking() on tl.LensId equals l.Id
            where trackerIds.Contains(tl.TrackerConfigurationId)
            orderby l.DisplayOrder
            select new { tl.TrackerConfigurationId, LensId = l.Id, l.Name }
        ).ToListAsync(cancellationToken);
        var lensesByTracker = trackerLensRows
            .GroupBy(x => x.TrackerConfigurationId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<WorkspacePromptLensOptionDto>)g
                    .Select(x => new WorkspacePromptLensOptionDto(x.LensId, x.Name))
                    .ToList());

        // Brand-name lookup for the tracker option list. Pulled up here so
        // it's available for the empty-prompts path too — the dialog still
        // needs trackers/brand names even when there are zero prompts.
        var brandNameByIdForOptions = await _db.Brands.AsNoTracking()
            .Where(b => brandIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken);

        var trackerOptions = trackerRows
            .Select(t => new WorkspacePromptTrackerOptionDto(
                Id: t.Id,
                Name: t.Name,
                BrandId: t.BrandId,
                BrandName: brandNameByIdForOptions.TryGetValue(t.BrandId, out var bn) ? bn : string.Empty,
                PromptAllocation: t.PromptAllocation,
                PromptUsed: usedByTracker.TryGetValue(t.Id, out var used) ? used : 0,
                Lenses: lensesByTracker.TryGetValue(t.Id, out var ls)
                    ? ls
                    : Array.Empty<WorkspacePromptLensOptionDto>()))
            .OrderBy(t => t.BrandName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(t => t.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
        var totalAllocation = trackerRows.Sum(t => t.PromptAllocation);
        var totalUsed = prompts.Count;

        if (prompts.Count == 0)
        {
            return new WorkspacePromptsDto(
                workspaceId, windowFrom, windowTo,
                Array.Empty<WorkspacePromptRowDto>(),
                totalAllocation, totalUsed, trackerOptions);
        }
        var promptIds = prompts.Select(p => p.Id).ToList();

        // Lens names for the prompts we care about.
        var lensIds = prompts.Select(p => p.LensId).Distinct().ToList();
        var lensNameById = await _db.Lenses.AsNoTracking()
            .Where(l => lensIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name, cancellationToken);

        // Brand names — already loaded above to build the tracker option
        // list, reused here for the row-level brand attribution.
        var brandNameById = brandNameByIdForOptions;

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

        // PromptProducts → product names. Same shape as topics.
        var productLinks = await (
            from pp in _db.PromptProducts.AsNoTracking()
            join pr in _db.Products.AsNoTracking() on pp.ProductId equals pr.Id
            where promptIds.Contains(pp.PromptId)
            select new { pp.PromptId, pr.Name }
        ).ToListAsync(cancellationToken);
        var productsByPrompt = productLinks
            .GroupBy(x => x.PromptId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Name).Distinct().OrderBy(n => n).ToList());

        // PromptAudiences → audience names. Same shape as topics.
        var audienceLinks = await (
            from pa in _db.PromptAudiences.AsNoTracking()
            join a in _db.Audiences.AsNoTracking() on pa.AudienceId equals a.Id
            where promptIds.Contains(pa.PromptId)
            select new { pa.PromptId, a.Name }
        ).ToListAsync(cancellationToken);
        var audiencesByPrompt = audienceLinks
            .GroupBy(x => x.PromptId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Name).Distinct().OrderBy(n => n).ToList());

        // PromptMarkets → market names + country codes. Each market carries
        // an optional CountryCode; we pull both in one shot so the row can
        // populate both Markets and MarketCountryCodes without re-querying.
        var marketLinks = await (
            from pm in _db.PromptMarkets.AsNoTracking()
            join m in _db.Markets.AsNoTracking() on pm.MarketId equals m.Id
            where promptIds.Contains(pm.PromptId)
            select new { pm.PromptId, m.Name, m.CountryCode }
        ).ToListAsync(cancellationToken);
        var marketsByPrompt = marketLinks
            .GroupBy(x => x.PromptId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Name).Distinct().OrderBy(n => n).ToList());
        var marketCountryCodesByPrompt = marketLinks
            .GroupBy(x => x.PromptId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .Select(x => x.CountryCode)
                    .Where(c => !string.IsNullOrWhiteSpace(c))
                    .Select(c => c!)
                    .Distinct()
                    .OrderBy(c => c)
                    .ToList());

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

        // Answer-level facts: one row per AIAnswer for any of our prompts within the
        // window. Used to derive the denominator of visibility (total answers per prompt).
        var answerFacts = await (
            from a in _db.AIAnswers.AsNoTracking()
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            where promptIds.Contains(pr.PromptId)
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            select new { pr.PromptId, AnswerId = a.Id }
        ).ToListAsync(cancellationToken);
        var answerCountByPrompt = answerFacts
            .GroupBy(a => a.PromptId)
            .ToDictionary(g => g.Key, g => g.Count());

        // Brand mention facts: every brand-type mention attached to an in-window
        // answer for one of our prompts. Filtered to the prompt's tracker brand
        // when aggregating per row below.
        var mentionFacts = await (
            from m in _db.Mentions.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on m.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            where promptIds.Contains(pr.PromptId)
                && m.EntityType == MentionEntityType.Brand
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            select new BrandMentionFact(
                pr.PromptId,
                a.Id,
                m.EntityId,
                m.Sentiment,
                m.MentionCount,
                m.FirstMentionPosition)
        ).ToListAsync(cancellationToken);
        var mentionsByPrompt = mentionFacts
            .GroupBy(m => m.PromptId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var rows = prompts
            .Select(p =>
            {
                var tracker = trackerById[p.TrackerConfigurationId];
                var lensName = lensNameById.TryGetValue(p.LensId, out var ln) ? ln : "(unknown)";
                var brandName = brandNameById.TryGetValue(tracker.BrandId, out var bn) ? bn : "(unknown)";
                var topics = topicsByPrompt.TryGetValue(p.Id, out var t) ? t : new List<string>();
                var products = productsByPrompt.TryGetValue(p.Id, out var pr) ? pr : new List<string>();
                var audiences = audiencesByPrompt.TryGetValue(p.Id, out var au) ? au : new List<string>();
                var markets = marketsByPrompt.TryGetValue(p.Id, out var mk) ? mk : new List<string>();
                var marketCountryCodes = marketCountryCodesByPrompt.TryGetValue(p.Id, out var cc) ? cc : new List<string>();
                runAggByPrompt.TryGetValue(p.Id, out var agg);

                // Analytical columns. Mentions are filtered to the prompt's
                // tracker brand so cross-tracker brand mentions in the same
                // answer don't contaminate this prompt's row.
                var brandMentions = mentionsByPrompt.TryGetValue(p.Id, out var ms)
                    ? ms.Where(m => m.EntityId == tracker.BrandId).ToList()
                    : new List<BrandMentionFact>();
                var totalAnswers = answerCountByPrompt.TryGetValue(p.Id, out var ac) ? ac : 0;
                double? visibility = totalAnswers == 0
                    ? (double?)null
                    : (double)brandMentions.Select(m => m.AnswerId).Distinct().Count() / totalAnswers;
                var brandMentionCount = brandMentions.Sum(m => m.MentionCount);
                string? dominantSentiment = brandMentions.Count == 0
                    ? null
                    : brandMentions
                        .GroupBy(m => m.Sentiment)
                        .OrderByDescending(g => g.Count())
                        .ThenBy(g => (int)g.Key)
                        .First().Key.ToString();
                double? avgPosition = brandMentions.Count == 0
                    ? (double?)null
                    : brandMentions.Average(m => m.FirstMentionPosition);

                return new WorkspacePromptRowDto(
                    PromptId: p.Id,
                    Text: p.PromptText,
                    LensId: p.LensId,
                    LensName: lensName,
                    Topics: topics,
                    Products: products,
                    Audiences: audiences,
                    Markets: markets,
                    MarketCountryCodes: marketCountryCodes,
                    TrackerId: tracker.Id,
                    TrackerName: tracker.Name,
                    BrandId: tracker.BrandId,
                    BrandName: brandName,
                    ScanCount: agg?.ScanCount ?? 0,
                    LastScanAt: agg?.LastScanAt,
                    PlatformCodes: agg?.PlatformCodes ?? new List<string>(),
                    VisibilityRate: visibility,
                    BrandMentionCount: brandMentionCount,
                    DominantSentiment: dominantSentiment,
                    AverageFirstMentionPosition: avgPosition);
            })
            .OrderByDescending(r => r.LastScanAt ?? DateTime.MinValue)
            .ThenBy(r => r.Text, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new WorkspacePromptsDto(
            workspaceId, windowFrom, windowTo, rows,
            totalAllocation, totalUsed, trackerOptions);
    }

    // Stable shape for the two early-exit paths (no brands / no in-scope
    // trackers). Keeps the contract honest: every caller gets the same
    // top-level field set whether or not there are prompts.
    private static WorkspacePromptsDto EmptyResult(Guid workspaceId, DateTime? windowFrom, DateTime windowTo) =>
        new(workspaceId, windowFrom, windowTo,
            Array.Empty<WorkspacePromptRowDto>(),
            TotalAllocation: 0,
            TotalUsed: 0,
            Trackers: Array.Empty<WorkspacePromptTrackerOptionDto>());

}
