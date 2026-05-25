using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetTrackerScheduleSetupQueryHandler
    : IRequestHandler<GetTrackerScheduleSetupQuery, TrackerScheduleSetupDto?>
{
    private readonly IAppDbContext _db;

    public GetTrackerScheduleSetupQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<TrackerScheduleSetupDto?> Handle(
        GetTrackerScheduleSetupQuery request,
        CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations
            .FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken);
        if (tracker == null) return null;

        var platforms = await _db.AIPlatforms
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new PlatformOptionDto(p.Id, p.Code, p.Name))
            .ToListAsync(cancellationToken);

        var selected = await _db.TrackerPlatforms
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.AIPlatformId)
            .ToListAsync(cancellationToken);
        // Default to the platforms marked default-selected when none chosen yet (ADR-002 §14).
        if (selected.Count == 0)
            selected = await _db.AIPlatforms
                .Where(p => p.IsDefaultSelected)
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

        var activePromptCount = await _db.Prompts.CountAsync(
            p => p.TrackerConfigurationId == tracker.Id && p.Status == PromptStatus.Active,
            cancellationToken);

        return new TrackerScheduleSetupDto(
            tracker.Id,
            tracker.Name,
            tracker.Cadence.ToString(),
            tracker.Timezone,
            activePromptCount,
            platforms,
            selected);
    }
}
