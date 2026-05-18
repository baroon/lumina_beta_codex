using AIVisibility.Domain.Entities;

namespace AIVisibility.Application.Interfaces;

public interface IWebsiteDiscoveryService
{
    Task<CrawlResult> CrawlWebsiteAsync(string url, Guid discoveryRunId, CancellationToken cancellationToken = default);
}

public record CrawlResult(
    List<CrawledPage> Pages,
    int TotalPagesCrawled);
