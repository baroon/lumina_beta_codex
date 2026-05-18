using System.Text.RegularExpressions;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AngleSharp;
using AngleSharp.Dom;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Crawling;

public class WebsiteDiscoveryService : IWebsiteDiscoveryService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IBlobStorageService _blobStorage;
    private readonly ILogger<WebsiteDiscoveryService> _logger;
    private const int MaxPages = 10;
    private static readonly TimeSpan CrawlBudget = TimeSpan.FromSeconds(30);

    public WebsiteDiscoveryService(
        IHttpClientFactory httpClientFactory,
        IBlobStorageService blobStorage,
        ILogger<WebsiteDiscoveryService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _blobStorage = blobStorage;
        _logger = logger;
    }

    public async Task<CrawlResult> CrawlWebsiteAsync(string url, Guid discoveryRunId, CancellationToken cancellationToken = default)
    {
        var pages = new List<CrawledPage>();
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var baseUri = new Uri(url);
        var client = _httpClientFactory.CreateClient("Crawler");
        client.Timeout = TimeSpan.FromSeconds(10);

        var config = Configuration.Default;
        var browsingContext = BrowsingContext.New(config);
        var deadline = DateTime.UtcNow.Add(CrawlBudget);

        // Start with homepage
        var toVisit = new List<(string Url, int Priority)> { (url, 100) };

        while (toVisit.Count > 0 && pages.Count < MaxPages && DateTime.UtcNow < deadline)
        {
            var current = toVisit.OrderByDescending(x => x.Priority).First();
            toVisit.Remove(current);

            var normalizedUrl = NormalizeUrl(current.Url);
            if (visited.Contains(normalizedUrl)) continue;
            visited.Add(normalizedUrl);

            try
            {
                var response = await client.GetAsync(current.Url, cancellationToken);
                if (!response.IsSuccessStatusCode) continue;

                var html = await response.Content.ReadAsStringAsync(cancellationToken);
                var document = await browsingContext.OpenAsync(req => req.Content(html), cancellationToken);

                var page = new CrawledPage
                {
                    Id = Guid.NewGuid(),
                    DiscoveryRunId = discoveryRunId,
                    Url = current.Url,
                    Title = document.Title,
                    MetaDescription = document.QuerySelector("meta[name='description']")?.GetAttribute("content"),
                    HeadingsJson = ExtractHeadingsJson(document),
                    StatusCode = (int)response.StatusCode
                };

                // Store extracted text in blob storage
                var textContent = document.Body?.TextContent ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(textContent))
                {
                    try
                    {
                        var blobRef = await _blobStorage.UploadTextAsync(
                            "crawled-pages",
                            $"{discoveryRunId}/{page.Id}.txt",
                            textContent,
                            cancellationToken);
                        page.ExtractedTextBlobRef = blobRef;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to upload text blob for page {Url}", current.Url);
                    }
                }

                pages.Add(page);

                // Extract internal links for further crawling
                if (pages.Count < MaxPages)
                {
                    var links = document.QuerySelectorAll("a[href]")
                        .Select(a => a.GetAttribute("href"))
                        .Where(href => href != null)
                        .Select(href => ResolveUrl(baseUri, href!))
                        .Where(resolved => resolved != null && IsSameDomain(baseUri, new Uri(resolved)))
                        .Where(resolved => !visited.Contains(NormalizeUrl(resolved!)))
                        .Distinct()
                        .Select(resolved => (Url: resolved!, Priority: PagePriorityClassifier.GetPriority(resolved!)))
                        .ToList();

                    toVisit.AddRange(links);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to crawl page {Url}", current.Url);
            }
        }

        return new CrawlResult(pages, pages.Count);
    }

    private static string? ResolveUrl(Uri baseUri, string href)
    {
        try
        {
            if (href.StartsWith('#') || href.StartsWith("mailto:") || href.StartsWith("tel:") || href.StartsWith("javascript:"))
                return null;
            var resolved = new Uri(baseUri, href);
            return resolved.GetLeftPart(UriPartial.Path);
        }
        catch { return null; }
    }

    private static bool IsSameDomain(Uri baseUri, Uri uri)
        => uri.Host.Equals(baseUri.Host, StringComparison.OrdinalIgnoreCase);

    private static string NormalizeUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            return uri.GetLeftPart(UriPartial.Path).TrimEnd('/').ToLowerInvariant();
        }
        catch { return url.ToLowerInvariant(); }
    }

    private static string ExtractHeadingsJson(IDocument document)
    {
        var headings = document.QuerySelectorAll("h1, h2, h3, h4")
            .Select(h => new { Tag = h.TagName.ToLower(), Text = h.TextContent.Trim() })
            .Where(h => !string.IsNullOrWhiteSpace(h.Text))
            .Take(50)
            .ToList();

        return System.Text.Json.JsonSerializer.Serialize(headings);
    }
}
