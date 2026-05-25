using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Trackers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Trackers;

public class GetTrackerSetupPreviewQueryHandler
    : IRequestHandler<GetTrackerSetupPreviewQuery, TrackerSetupPreviewDto?>
{
    private readonly IAppDbContext _db;

    public GetTrackerSetupPreviewQueryHandler(IAppDbContext db) => _db = db;

    public async Task<TrackerSetupPreviewDto?> Handle(
        GetTrackerSetupPreviewQuery request,
        CancellationToken cancellationToken)
    {
        var brand = await _db.Brands
            .Include(b => b.BrandProfile)
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken);
        if (brand == null) return null;

        var products = await _db.Products.Where(p => p.BrandId == brand.Id).ToListAsync(cancellationToken);
        var markets = await _db.Markets.Where(m => m.BrandId == brand.Id).ToListAsync(cancellationToken);
        var topicCount = await _db.Topics.CountAsync(t => t.BrandId == brand.Id, cancellationToken);
        var competitorCount = await _db.Competitors.CountAsync(c => c.BrandId == brand.Id, cancellationToken);
        var audienceCount = await _db.Audiences.CountAsync(a => a.BrandId == brand.Id, cancellationToken);
        var checkCount = await _db.Lenses.CountAsync(cancellationToken);

        var marketName = markets.FirstOrDefault()?.Name;
        var category = brand.BrandProfile?.Category;
        var suggestedName = TrackerNaming.Generate(marketName, category, products.FirstOrDefault()?.Name);

        return new TrackerSetupPreviewDto(
            brand.Id,
            brand.Name,
            suggestedName,
            marketName,
            category,
            topicCount,
            competitorCount,
            products.Count,
            audienceCount,
            markets.Count,
            checkCount,
            CreateTrackerCommandHandler.DefaultPromptAllocation);
    }
}
