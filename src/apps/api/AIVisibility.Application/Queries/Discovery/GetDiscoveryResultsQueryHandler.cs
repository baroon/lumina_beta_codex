using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Discovery;

public class GetDiscoveryResultsQueryHandler : IRequestHandler<GetDiscoveryResultsQuery, DiscoveryResultsDto?>
{
    private readonly IAppDbContext _db;
    private readonly IDiscoveryDraftStore _draftStore;

    public GetDiscoveryResultsQueryHandler(IAppDbContext db, IDiscoveryDraftStore draftStore)
    {
        _db = db;
        _draftStore = draftStore;
    }

    public async Task<DiscoveryResultsDto?> Handle(GetDiscoveryResultsQuery request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands
            .Include(b => b.DiscoveryRuns)
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken);

        if (brand == null) return null;

        var latestRun = brand.DiscoveryRuns
            .OrderByDescending(r => r.StartedAt)
            .FirstOrDefault();

        if (latestRun == null) return null;

        // Suggestions live only in the transient draft store, never the candidate tables.
        // If the draft is gone (expired/restart, or already confirmed) return a minimal
        // result carrying the run status so the UI can route correctly.
        // Aliases live on the durable Brand, so always reflect the current value
        // (the cached draft may predate an alias edit).
        var draft = _draftStore.Get(latestRun.Id);
        if (draft != null)
            return draft with { Aliases = brand.Aliases };

        return new DiscoveryResultsDto(
            brand.Id,
            brand.Name,
            latestRun.Status.ToString(),
            null,
            new List<CandidateDto>(),
            new List<CandidateDto>(),
            new List<CandidateDto>(),
            new List<CandidateDto>(),
            new List<CandidateDto>(),
            new List<CandidateDto>(),
            brand.Aliases);
    }
}
