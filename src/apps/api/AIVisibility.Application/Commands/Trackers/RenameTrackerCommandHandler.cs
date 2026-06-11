using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AIVisibility.Application.Commands.Trackers;

public class RenameTrackerCommandHandler : IRequestHandler<RenameTrackerCommand, RenameTrackerResult>
{
    private readonly IAppDbContext _db;

    public RenameTrackerCommandHandler(IAppDbContext db) => _db = db;

    public async Task<RenameTrackerResult> Handle(
        RenameTrackerCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Tracker name cannot be empty.");

        var tracker = await _db.TrackerConfigurations
            .FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken)
            ?? throw new InvalidOperationException($"Tracker {request.TrackerId} not found.");

        // No-op when the trimmed name matches what's already stored.
        // Save the round-trip; the FE may submit the unchanged value
        // when the user clicks away from the inline editor.
        if (string.Equals(tracker.Name, name, StringComparison.Ordinal))
            return new RenameTrackerResult(tracker.Id, tracker.Name);

        var clash = await _db.TrackerConfigurations
            .Where(t => t.BrandId == tracker.BrandId && t.Id != tracker.Id)
            .Select(t => t.Name)
            .ToListAsync(cancellationToken);
        if (clash.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new DuplicateTrackerNameException(name);

        tracker.Name = name;
        tracker.IsNameUserEdited = true;
        tracker.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // A concurrent rename grabbed the same name between our
            // pre-check and the insert. Surface the same exception the
            // pre-check would have so the API layer 409s either way.
            throw new DuplicateTrackerNameException(name);
        }

        return new RenameTrackerResult(tracker.Id, tracker.Name);
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation;
}
