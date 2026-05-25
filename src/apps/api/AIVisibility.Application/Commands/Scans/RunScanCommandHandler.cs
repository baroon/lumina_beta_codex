using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Scans;

public class RunScanCommandHandler : IRequestHandler<RunScanCommand, RunScanResult>
{
    private readonly IAppDbContext _db;
    private readonly IScanQueue _queue;

    public RunScanCommandHandler(IAppDbContext db, IScanQueue queue)
    {
        _db = db;
        _queue = queue;
    }

    public async Task<RunScanResult> Handle(RunScanCommand request, CancellationToken cancellationToken)
    {
        var tracker =
            await _db.TrackerConfigurations.FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken)
            ?? throw new InvalidOperationException($"Tracker {request.TrackerId} not found.");

        // On-demand trackers may only be run manually once per 24 hours.
        if (tracker.Cadence == Cadence.OnDemand
            && request.TriggerType == ScanTriggerType.Manual
            && tracker.LastRunAt is { } last
            && DateTime.UtcNow - last < TimeSpan.FromHours(24))
        {
            throw new InvalidOperationException("On-demand trackers can only be run once every 24 hours.");
        }

        var activePromptIds = await _db.Prompts
            .Where(p => p.TrackerConfigurationId == tracker.Id && p.Status == PromptStatus.Active)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);
        var platformIds = await _db.TrackerPlatforms
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.AIPlatformId)
            .ToListAsync(cancellationToken);

        if (activePromptIds.Count == 0 || platformIds.Count == 0)
            throw new InvalidOperationException("Tracker has no active prompts or platforms to scan.");

        var now = DateTime.UtcNow;
        var run = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            TriggerType = request.TriggerType,
            Status = ScanRunStatus.Pending,
            PromptCount = activePromptIds.Count,
            PlatformCount = platformIds.Count,
            ScanCheckCount = activePromptIds.Count * platformIds.Count,
            StartedAt = now,
        };
        _db.ScanRuns.Add(run);

        foreach (var promptId in activePromptIds)
        {
            foreach (var platformId in platformIds)
            {
                _db.PromptRuns.Add(new PromptRun
                {
                    Id = Guid.NewGuid(),
                    ScanRunId = run.Id,
                    PromptId = promptId,
                    AIPlatformId = platformId,
                    Status = PromptRunStatus.Pending,
                });
            }
        }

        tracker.LastRunAt = now;
        tracker.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);

        _queue.Enqueue(run.Id);
        return new RunScanResult(run.Id, run.ScanCheckCount);
    }
}
