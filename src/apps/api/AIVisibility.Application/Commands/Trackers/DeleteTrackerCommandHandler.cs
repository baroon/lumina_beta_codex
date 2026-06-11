using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Trackers;

public class DeleteTrackerCommandHandler : IRequestHandler<DeleteTrackerCommand>
{
    private readonly IAppDbContext _db;

    public DeleteTrackerCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(DeleteTrackerCommand request, CancellationToken cancellationToken)
    {
        var tracker = await _db.TrackerConfigurations
            .FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Tracker {request.TrackerId} not found.");

        _db.TrackerConfigurations.Remove(tracker);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
