using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Claims;

public class GetScanClaimsQueryHandler : IRequestHandler<GetScanClaimsQuery, ScanClaimsDto?>
{
    private readonly IAppDbContext _db;

    public GetScanClaimsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanClaimsDto?> Handle(GetScanClaimsQuery request, CancellationToken cancellationToken)
    {
        var scanExists = await _db.ScanRuns.AsNoTracking()
            .AnyAsync(s => s.Id == request.ScanRunId, cancellationToken);
        if (!scanExists) return null;

        // Optional review-status filter. Invalid strings degrade to "no filter" —
        // FE is the only caller and validates its own input, but this keeps
        // a typoed query string from 500'ing the page.
        ClaimReviewStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(request.ReviewStatus)
            && Enum.TryParse<ClaimReviewStatus>(request.ReviewStatus, ignoreCase: true, out var parsed))
        {
            statusFilter = parsed;
        }

        // Pull claims joined to their Mention + AIAnswer + PromptRun to scope
        // by scan. EF in-memory test path doesn't support cross-context joins
        // well; pull mention ids first then claims.
        var mentionIds = await _db.PromptRuns.AsNoTracking()
            .Where(pr => pr.ScanRunId == request.ScanRunId)
            .Join(_db.AIAnswers.AsNoTracking(),
                pr => pr.Id, a => a.PromptRunId,
                (_, a) => a.Id)
            .Join(_db.Mentions.AsNoTracking(),
                aid => aid, m => m.AIAnswerId,
                (_, m) => m.Id)
            .ToListAsync(cancellationToken);

        if (mentionIds.Count == 0)
        {
            return new ScanClaimsDto(request.ScanRunId, Array.Empty<FactualClaimDto>());
        }

        var claimsQuery = _db.FactualClaims.AsNoTracking()
            .Where(c => mentionIds.Contains(c.MentionId));
        if (statusFilter.HasValue)
        {
            claimsQuery = claimsQuery.Where(c => c.ReviewStatus == statusFilter.Value);
        }
        var claims = await claimsQuery.ToListAsync(cancellationToken);
        if (claims.Count == 0)
        {
            return new ScanClaimsDto(request.ScanRunId, Array.Empty<FactualClaimDto>());
        }

        // Hydrate entity name + entity type from the mention. NormalizedName
        // is what the AI used; good enough for the inbox display.
        var claimMentionIds = claims.Select(c => c.MentionId).Distinct().ToList();
        var mentionLookup = await _db.Mentions.AsNoTracking()
            .Where(m => claimMentionIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => new
            {
                Name = m.NormalizedName,
                Type = m.EntityType.ToString(),
            }, cancellationToken);

        var rows = claims
            .Select(c =>
            {
                mentionLookup.TryGetValue(c.MentionId, out var ent);
                return new FactualClaimDto(
                    Id: c.Id,
                    EntityName: ent?.Name ?? string.Empty,
                    EntityType: ent?.Type ?? string.Empty,
                    ClaimText: c.ClaimText,
                    Subject: c.Subject,
                    AssertedValue: c.AssertedValue,
                    EvidenceSnippet: c.EvidenceSnippet,
                    Verifiability: c.Verifiability.ToString(),
                    ReviewStatus: c.ReviewStatus.ToString(),
                    ConfidenceScore: c.ConfidenceScore,
                    CreatedAt: c.CreatedAt);
            })
            // Stable display order: Pending first (the review inbox), then
            // newest-first within each status bucket.
            .OrderBy(c => c.ReviewStatus == "Pending" ? 0 : 1)
            .ThenByDescending(c => c.CreatedAt)
            .ToList();

        return new ScanClaimsDto(request.ScanRunId, rows);
    }
}
