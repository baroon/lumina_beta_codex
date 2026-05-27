using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Scans;

public class GetAllScansQueryHandler : IRequestHandler<GetAllScansQuery, IReadOnlyList<ScanListItemDto>>
{
    private const int MaxRows = 100;

    private readonly IAppDbContext _db;

    public GetAllScansQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ScanListItemDto>> Handle(
        GetAllScansQuery request, CancellationToken cancellationToken)
    {
        // One round-trip per join is fine for a 100-row temporary list. Left
        // join on analysis_jobs so scans without an analysis job (mid-extract
        // or pre-Slice-1 scans) still surface, just with AnalysisStatus=null.
        var rows = await (
            from sr in _db.ScanRuns
            join tc in _db.TrackerConfigurations on sr.TrackerConfigurationId equals tc.Id
            join b in _db.Brands on tc.BrandId equals b.Id
            join ajLeft in _db.AnalysisJobs on sr.Id equals ajLeft.ScanRunId into ajGrp
            from aj in ajGrp.DefaultIfEmpty()
            orderby sr.StartedAt descending
            select new
            {
                sr.Id, sr.TrackerConfigurationId, TrackerName = tc.Name,
                BrandId = b.Id, BrandName = b.Name,
                sr.StartedAt, sr.CompletedAt, sr.Status, AnalysisStatus = (string?)(aj != null ? aj.Status.ToString() : null),
                sr.ScanCheckCount, sr.CompletedCount, sr.FailedCount,
            })
            .Take(MaxRows)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new ScanListItemDto(
                r.Id, r.TrackerConfigurationId, r.TrackerName,
                r.BrandId, r.BrandName,
                r.StartedAt, r.CompletedAt,
                r.Status.ToString(), r.AnalysisStatus,
                r.ScanCheckCount, r.CompletedCount, r.FailedCount))
            .ToList();
    }
}
