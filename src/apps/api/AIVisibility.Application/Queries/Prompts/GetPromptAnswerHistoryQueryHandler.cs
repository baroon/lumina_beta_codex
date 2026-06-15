using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Prompts;

public class GetPromptAnswerHistoryQueryHandler
    : IRequestHandler<GetPromptAnswerHistoryQuery, PromptAnswerHistoryDto>
{
    private sealed record BrandMentionFact(
        Guid AnswerId,
        Sentiment Sentiment,
        int MentionCount,
        double FirstMentionPosition,
        string EvidenceSnippet);

    private readonly IAppDbContext _db;
    private readonly IWorkspaceContext _workspace;

    public GetPromptAnswerHistoryQueryHandler(IAppDbContext db, IWorkspaceContext workspace)
    {
        _db = db;
        _workspace = workspace;
    }

    public async Task<PromptAnswerHistoryDto> Handle(
        GetPromptAnswerHistoryQuery request, CancellationToken cancellationToken)
    {
        var (windowFrom, windowTo) = WindowResolver.Resolve(request.From, request.To);
        var workspaceId = _workspace.WorkspaceId;

        // Workspace-scoped lookup: pull the prompt + its tracker's brand
        // in one shot, but only when the brand belongs to the caller's
        // workspace. A prompt from another workspace falls out of the
        // join and yields an empty result — no 404, no enumeration leak.
        var promptRow = await (
            from p in _db.Prompts.AsNoTracking()
            join t in _db.TrackerConfigurations.AsNoTracking() on p.TrackerConfigurationId equals t.Id
            join b in _db.Brands.AsNoTracking() on t.BrandId equals b.Id
            where p.Id == request.PromptId && b.WorkspaceId == workspaceId
            select new { p.PromptText, BrandId = b.Id }
        ).FirstOrDefaultAsync(cancellationToken);

        if (promptRow is null)
        {
            return new PromptAnswerHistoryDto(
                request.PromptId, string.Empty, windowFrom, windowTo,
                Array.Empty<PromptAnswerRowDto>());
        }

        // Per-answer rows: one row per AIAnswer for this prompt's runs
        // landing in the window, with the platform joined in for display.
        var answerRows = await (
            from a in _db.AIAnswers.AsNoTracking()
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join s in _db.ScanRuns.AsNoTracking() on pr.ScanRunId equals s.Id
            join ap in _db.AIPlatforms.AsNoTracking() on pr.AIPlatformId equals ap.Id
            where pr.PromptId == request.PromptId
                && (windowFrom == null || s.StartedAt >= windowFrom)
                && s.StartedAt <= windowTo
            select new
            {
                AnswerId = a.Id,
                ScanRunId = s.Id,
                ScannedAt = s.CompletedAt ?? s.StartedAt,
                PlatformCode = ap.Code,
                PlatformName = ap.Name,
                a.AnswerText,
            }
        ).ToListAsync(cancellationToken);

        if (answerRows.Count == 0)
        {
            return new PromptAnswerHistoryDto(
                request.PromptId, promptRow.PromptText, windowFrom, windowTo,
                Array.Empty<PromptAnswerRowDto>());
        }

        // Brand-only mentions across those answers. Cross-brand mentions
        // (competitors, products) live in the same table but get filtered
        // out here — the drawer only summarizes the tracked brand.
        var answerIds = answerRows.Select(a => a.AnswerId).ToList();
        var mentionFacts = await (
            from m in _db.Mentions.AsNoTracking()
            where answerIds.Contains(m.AIAnswerId)
                && m.EntityType == MentionEntityType.Brand
                && m.EntityId == promptRow.BrandId
            select new BrandMentionFact(
                m.AIAnswerId,
                m.Sentiment,
                m.MentionCount,
                m.FirstMentionPosition,
                m.EvidenceSnippet)
        ).ToListAsync(cancellationToken);
        var mentionsByAnswer = mentionFacts
            .GroupBy(m => m.AnswerId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var rows = answerRows
            .Select(a =>
            {
                mentionsByAnswer.TryGetValue(a.AnswerId, out var ms);
                ms ??= new List<BrandMentionFact>();

                var brandMentionCount = ms.Sum(m => m.MentionCount);
                string? dominantSentiment = ms.Count == 0
                    ? null
                    : ms.GroupBy(m => m.Sentiment)
                        .OrderByDescending(g => g.Count())
                        .ThenBy(g => (int)g.Key)
                        .First().Key.ToString();
                double? firstMentionPosition = ms.Count == 0
                    ? null
                    : ms.Min(m => m.FirstMentionPosition);
                string? evidenceSnippet = ms
                    .Select(m => m.EvidenceSnippet)
                    .FirstOrDefault(s => !string.IsNullOrWhiteSpace(s));

                return new PromptAnswerRowDto(
                    AnswerId: a.AnswerId,
                    ScanRunId: a.ScanRunId,
                    ScannedAt: a.ScannedAt,
                    PlatformCode: a.PlatformCode,
                    PlatformName: a.PlatformName,
                    AnswerText: a.AnswerText,
                    BrandMentionCount: brandMentionCount,
                    DominantSentiment: dominantSentiment,
                    FirstMentionPosition: firstMentionPosition,
                    EvidenceSnippet: evidenceSnippet);
            })
            // Newest answer first — the drawer renders these as a vertical
            // stack and the user wants the latest scan at the top.
            .OrderByDescending(r => r.ScannedAt)
            .ThenBy(r => r.PlatformCode, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new PromptAnswerHistoryDto(
            request.PromptId, promptRow.PromptText, windowFrom, windowTo, rows);
    }
}
