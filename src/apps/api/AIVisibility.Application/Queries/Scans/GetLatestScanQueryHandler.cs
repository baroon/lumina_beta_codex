using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Scans;

public class GetLatestScanQueryHandler : IRequestHandler<GetLatestScanQuery, ScanStatusDto?>
{
    private readonly IAppDbContext _db;

    public GetLatestScanQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ScanStatusDto?> Handle(GetLatestScanQuery request, CancellationToken cancellationToken)
    {
        var run = await _db.ScanRuns
            .Where(r => r.TrackerConfigurationId == request.TrackerId)
            .OrderByDescending(r => r.StartedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (run == null) return null;

        // Recompute counts from the prompt runs so polling reflects live progress.
        var completed = await _db.PromptRuns.CountAsync(
            p => p.ScanRunId == run.Id && p.Status == PromptRunStatus.Completed, cancellationToken);
        var failed = await _db.PromptRuns.CountAsync(
            p => p.ScanRunId == run.Id && p.Status == PromptRunStatus.Failed, cancellationToken);

        return new ScanStatusDto(
            run.Id,
            run.Status.ToString(),
            run.TriggerType.ToString(),
            run.ScanCheckCount,
            completed,
            failed,
            run.StartedAt,
            run.CompletedAt);
    }
}
