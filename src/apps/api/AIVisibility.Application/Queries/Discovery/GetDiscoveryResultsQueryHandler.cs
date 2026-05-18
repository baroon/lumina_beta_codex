using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Discovery;

public class GetDiscoveryResultsQueryHandler : IRequestHandler<GetDiscoveryResultsQuery, DiscoveryResultsDto?>
{
    private readonly IAppDbContext _db;

    public GetDiscoveryResultsQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<DiscoveryResultsDto?> Handle(GetDiscoveryResultsQuery request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands
            .Include(b => b.BrandProfile)
            .Include(b => b.Products)
            .Include(b => b.Audiences)
            .Include(b => b.Markets)
            .Include(b => b.Topics)
            .Include(b => b.Competitors)
            .Include(b => b.TrustSignals)
            .Include(b => b.DiscoveryRuns)
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken);

        if (brand == null) return null;

        var latestRun = brand.DiscoveryRuns
            .OrderByDescending(r => r.StartedAt)
            .FirstOrDefault();

        return new DiscoveryResultsDto(
            brand.Id,
            brand.Name,
            latestRun?.Status.ToString() ?? "Unknown",
            brand.BrandProfile != null
                ? new BrandProfileDto(
                    brand.BrandProfile.Id,
                    brand.BrandProfile.ShortDescription,
                    brand.BrandProfile.Industry,
                    brand.BrandProfile.Category,
                    brand.BrandProfile.Positioning,
                    brand.BrandProfile.Confidence,
                    brand.BrandProfile.Source.ToString(),
                    brand.BrandProfile.Status.ToString())
                : null,
            brand.Products.Select(p => ToCandidate(p.Id, p.Name, p.Description, p.Confidence, p.Source, p.Status,
                new Dictionary<string, object?> { ["productType"] = p.ProductType.ToString(), ["relatedPageUrl"] = p.RelatedPageUrl })).ToList(),
            brand.Audiences.Select(a => ToCandidate(a.Id, a.Name, a.Description, a.Confidence, a.Source, a.Status, new Dictionary<string, object?>())).ToList(),
            brand.Markets.Select(m => ToCandidate(m.Id, m.Name, null, m.Confidence, m.Source, m.Status,
                new Dictionary<string, object?> { ["marketType"] = m.MarketType.ToString(), ["countryCode"] = m.CountryCode, ["region"] = m.Region, ["languageCode"] = m.LanguageCode, ["currencyCode"] = m.CurrencyCode })).ToList(),
            brand.Topics.Select(t => ToCandidate(t.Id, t.Name, t.Description, t.Confidence, t.Source, t.Status,
                new Dictionary<string, object?> { ["topicType"] = t.TopicType.ToString() })).ToList(),
            brand.Competitors.Select(c => ToCandidate(c.Id, c.Name, c.Description, c.Confidence, c.Source, c.Status,
                new Dictionary<string, object?> { ["domain"] = c.Domain })).ToList(),
            brand.TrustSignals.Select(ts => ToCandidate(ts.Id, ts.Name, ts.Description, ts.Confidence, ts.Source, ts.Status,
                new Dictionary<string, object?> { ["signalType"] = ts.SignalType.ToString() })).ToList());
    }

    private static CandidateDto ToCandidate(Guid id, string name, string? description, double confidence, CandidateSource source, CandidateStatus status, Dictionary<string, object?> metadata)
        => new(id, name, description, confidence, source.ToString(), status.ToString(), metadata);
}
