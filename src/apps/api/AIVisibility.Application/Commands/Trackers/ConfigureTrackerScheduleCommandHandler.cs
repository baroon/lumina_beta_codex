using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Trackers;

public class ConfigureTrackerScheduleCommandHandler
    : IRequestHandler<ConfigureTrackerScheduleCommand, ConfigureTrackerScheduleResult>
{
    private readonly IAppDbContext _db;

    public ConfigureTrackerScheduleCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<ConfigureTrackerScheduleResult> Handle(
        ConfigureTrackerScheduleCommand request,
        CancellationToken cancellationToken)
    {
        var tracker =
            await _db.TrackerConfigurations.FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken)
            ?? throw new InvalidOperationException($"Tracker {request.TrackerId} not found.");

        if (request.PlatformIds.Count == 0)
            throw new InvalidOperationException("At least one platform must be selected.");

        if (!Enum.TryParse<Cadence>(request.Cadence, ignoreCase: true, out var cadence))
            throw new InvalidOperationException($"Invalid cadence: {request.Cadence}.");

        var validIds = await _db.AIPlatforms.Select(p => p.Id).ToListAsync(cancellationToken);
        var platformIds = request.PlatformIds.Where(validIds.Contains).Distinct().ToList();
        if (platformIds.Count == 0)
            throw new InvalidOperationException("No valid platforms selected.");

        // Replace the platform selection.
        var existing = await _db.TrackerPlatforms
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .ToListAsync(cancellationToken);
        _db.TrackerPlatforms.RemoveRange(existing);
        foreach (var id in platformIds)
        {
            _db.TrackerPlatforms.Add(new TrackerPlatform
            {
                TrackerConfigurationId = tracker.Id,
                AIPlatformId = id,
            });
        }

        var now = DateTime.UtcNow;
        tracker.Cadence = cadence;
        if (!string.IsNullOrWhiteSpace(request.Timezone))
            tracker.Timezone = request.Timezone;
        tracker.Status = TrackerStatus.Active;
        tracker.NextRunAt = NextRun(cadence, now);
        tracker.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);

        var activePromptCount = await _db.Prompts.CountAsync(
            p => p.TrackerConfigurationId == tracker.Id && p.Status == PromptStatus.Active,
            cancellationToken);

        return new ConfigureTrackerScheduleResult(activePromptCount * platformIds.Count, cadence.ToString());
    }

    private static DateTime? NextRun(Cadence cadence, DateTime from) =>
        cadence switch
        {
            Cadence.Daily => from.AddDays(1),
            Cadence.Weekly => from.AddDays(7),
            _ => null, // OnDemand — manual only
        };
}
