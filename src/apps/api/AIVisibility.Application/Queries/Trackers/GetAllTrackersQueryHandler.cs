using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetAllTrackersQueryHandler : IRequestHandler<GetAllTrackersQuery, IReadOnlyList<TrackerListItemDto>>
{
    private readonly IAppDbContext _db;

    public GetAllTrackersQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<TrackerListItemDto>> Handle(
        GetAllTrackersQuery request, CancellationToken cancellationToken)
    {
        // Fetch trackers + their brand in one trip; aggregate scan stats in a
        // separate trip so the row count stays cheap (no GROUP BY on the
        // tracker-brand join). For the v1 list a per-tracker scan count is
        // enough — pagination + filtering can layer on later.
        var trackers = await (
            from tc in _db.TrackerConfigurations
            join b in _db.Brands on tc.BrandId equals b.Id
            orderby tc.CreatedAt descending
            select new
            {
                tc.Id,
                tc.Name,
                BrandId = b.Id,
                BrandName = b.Name,
                tc.Status,
                tc.CreatedAt,
            })
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (trackers.Count == 0) return Array.Empty<TrackerListItemDto>();

        var trackerIds = trackers.Select(t => t.Id).ToList();

        // Per-tracker scan stats: total count + most recent completed scan time.
        // Anonymous projection keeps the round trip narrow.
        var scanStats = await (
            from s in _db.ScanRuns.AsNoTracking()
            where trackerIds.Contains(s.TrackerConfigurationId)
            group s by s.TrackerConfigurationId into g
            select new
            {
                TrackerId = g.Key,
                ScanCount = g.Count(),
                LatestCompletedAt = g.Where(x => x.CompletedAt != null)
                    .Max(x => (DateTime?)x.CompletedAt!.Value),
            })
            .ToListAsync(cancellationToken);
        var statsById = scanStats.ToDictionary(s => s.TrackerId);

        return trackers.Select(t =>
        {
            statsById.TryGetValue(t.Id, out var stats);
            return new TrackerListItemDto(
                TrackerId: t.Id,
                Name: t.Name,
                BrandId: t.BrandId,
                BrandName: t.BrandName,
                Status: t.Status.ToString(),
                CreatedAt: t.CreatedAt,
                ScanCount: stats?.ScanCount ?? 0,
                LatestScanCompletedAt: stats?.LatestCompletedAt);
        }).ToList();
    }
}
