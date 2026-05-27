using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Sources;

public class GetScanSourceCitationsQueryHandler
    : IRequestHandler<GetScanSourceCitationsQuery, ScanSourceCitationsDto?>
{
    private const int SnippetLength = 400;

    private readonly IAppDbContext _db;

    public GetScanSourceCitationsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanSourceCitationsDto?> Handle(
        GetScanSourceCitationsQuery request, CancellationToken cancellationToken)
    {
        var scan = await _db.ScanRuns.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.ScanRunId, cancellationToken);
        if (scan == null) return null;

        var source = await _db.Sources.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.SourceId, cancellationToken);
        if (source == null) return null;

        // Pull every citation row of this source whose AIAnswer belongs to a
        // PromptRun in the requested scan, joining all the way through to the
        // prompt + platform + lens + answer text so the drawer can render
        // without follow-up queries.
        var citations = await (
            from c in _db.Citations.AsNoTracking()
            join a in _db.AIAnswers.AsNoTracking() on c.AIAnswerId equals a.Id
            join pr in _db.PromptRuns.AsNoTracking() on a.PromptRunId equals pr.Id
            join p in _db.Prompts.AsNoTracking() on pr.PromptId equals p.Id
            join plat in _db.AIPlatforms.AsNoTracking() on pr.AIPlatformId equals plat.Id
            join l in _db.Lenses.AsNoTracking() on p.LensId equals l.Id into lensJoin
            from lens in lensJoin.DefaultIfEmpty()
            join u in _db.SourceUrls.AsNoTracking() on c.SourceUrlId equals u.Id into urlJoin
            from sourceUrl in urlJoin.DefaultIfEmpty()
            where pr.ScanRunId == request.ScanRunId && c.SourceId == request.SourceId
            select new
            {
                c.Id,
                AIAnswerId = a.Id,
                c.CitationType,
                Url = sourceUrl != null ? sourceUrl.Url : null,
                AnswerText = a.AnswerText,
                p.PromptText,
                PlatformCode = plat.Code,
                PlatformName = plat.Name,
                LensName = lens != null ? lens.Name : null,
                CitedAt = c.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        var citationDtos = citations
            .Select(c => new SourceCitationDto(
                CitationId: c.Id,
                AIAnswerId: c.AIAnswerId,
                CitationType: c.CitationType.ToString(),
                Url: c.Url,
                AnswerSnippet: Truncate(c.AnswerText, SnippetLength),
                PromptText: c.PromptText,
                PlatformCode: c.PlatformCode,
                PlatformName: c.PlatformName,
                LensName: c.LensName,
                CitedAt: c.CitedAt))
            .OrderBy(c => c.CitedAt)
            .ToList();

        return new ScanSourceCitationsDto(
            ScanRunId: scan.Id,
            SourceId: source.Id,
            SourceName: source.SourceName,
            Domain: source.Domain,
            Citations: citationDtos);
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max] + "…";
}
