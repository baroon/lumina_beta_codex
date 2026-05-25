using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetTrackerScheduleSetupQueryHandler
    : IRequestHandler<GetTrackerScheduleSetupQuery, TrackerScheduleSetupDto?>
{
    private readonly IAppDbContext _db;
    private readonly IScanProvider _scanProvider;

    public GetTrackerScheduleSetupQueryHandler(IAppDbContext db, IScanProvider scanProvider)
    {
        _db = db;
        _scanProvider = scanProvider;
    }

    public async Task<TrackerScheduleSetupDto?> Handle(
        GetTrackerScheduleSetupQuery request,
        CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations
            .FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken);
        if (tracker == null) return null;

        var platformRows = await _db.AIPlatforms
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new { p.Id, p.Code, p.Name, p.IsDefaultSelected })
            .ToListAsync(cancellationToken);

        var platforms = platformRows
            .Select(p => new PlatformOptionDto(p.Id, p.Code, p.Name, _scanProvider.IsConfigured(p.Code)))
            .ToList();

        var selected = await _db.TrackerPlatforms
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.AIPlatformId)
            .ToListAsync(cancellationToken);
        // Default to platforms that are both default-selected and have a configured key (ADR-002 §14).
        if (selected.Count == 0)
            selected = platformRows
                .Where(p => p.IsDefaultSelected && _scanProvider.IsConfigured(p.Code))
                .Select(p => p.Id)
                .ToList();

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
