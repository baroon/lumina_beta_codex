using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Trackers;

public class UpdateTrackerLensesCommandHandler
    : IRequestHandler<UpdateTrackerLensesCommand, UpdateTrackerLensesResult>
{
    private readonly IAppDbContext _db;

    public UpdateTrackerLensesCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateTrackerLensesResult> Handle(
        UpdateTrackerLensesCommand request, CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations
            .FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken)
            ?? throw new InvalidOperationException($"Tracker {request.TrackerId} not found.");

        if (request.LensIds.Count == 0)
            throw new InvalidOperationException("At least one lens must be selected.");

        var validLensIds = await _db.Lenses
            .Select(l => l.Id)
            .ToListAsync(cancellationToken);
        var validSet = new HashSet<Guid>(validLensIds);
        var keep = request.LensIds.Where(validSet.Contains).Distinct().ToList();
        if (keep.Count == 0)
            throw new InvalidOperationException("None of the supplied lens IDs are valid.");

        var existing = await _db.TrackerLenses
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .ToListAsync(cancellationToken);
        _db.TrackerLenses.RemoveRange(existing);
        foreach (var id in keep)
        {
            _db.TrackerLenses.Add(new TrackerLens
            {
                TrackerConfigurationId = tracker.Id,
                LensId = id,
            });
        }

        tracker.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateTrackerLensesResult(keep.Count);
    }
}
