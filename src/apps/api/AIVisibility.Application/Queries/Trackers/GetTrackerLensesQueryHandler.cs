using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetTrackerLensesQueryHandler
    : IRequestHandler<GetTrackerLensesQuery, TrackerLensesSetupDto?>
{
    private readonly IAppDbContext _db;

    public GetTrackerLensesQueryHandler(IAppDbContext db) => _db = db;

    public async Task<TrackerLensesSetupDto?> Handle(
        GetTrackerLensesQuery request, CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations.AsNoTracking()
            .Where(t => t.Id == request.TrackerId)
            .Select(t => new { t.Id, t.Name })
            .FirstOrDefaultAsync(cancellationToken);
        if (tracker == null) return null;

        var lenses = await _db.Lenses.AsNoTracking()
            .OrderBy(l => l.DisplayOrder)
            .Select(l => new LensOptionDto(l.Id, l.Code, l.Name, l.Description, l.DisplayOrder))
            .ToListAsync(cancellationToken);

        var selected = await _db.TrackerLenses.AsNoTracking()
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.LensId)
            .ToListAsync(cancellationToken);

        return new TrackerLensesSetupDto(tracker.Id, tracker.Name, lenses, selected);
    }
}
