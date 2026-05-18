using AIVisibility.Domain.Entities;

namespace AIVisibility.Application.Interfaces;

public interface IContentExtractor
{
    Task<ExtractionResult> ExtractCandidatesAsync(Brand brand, List<CrawledPage> pages, CancellationToken cancellationToken = default);
}

public record ExtractionResult(
    BrandProfile? BrandProfile,
    List<Product> Products,
    List<Audience> Audiences,
    List<Market> Markets,
    List<Topic> Topics,
    List<TrustSignal> TrustSignals);
