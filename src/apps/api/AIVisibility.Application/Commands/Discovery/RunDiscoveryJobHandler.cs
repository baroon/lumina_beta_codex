using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Application.Commands.Discovery;

public class RunDiscoveryJobHandler : IRunDiscoveryJobHandler
{
    private readonly IAppDbContext _db;
    private readonly IWebsiteDiscoveryService _crawlService;
    private readonly IContentExtractor _extractor;
    private readonly ICompetitorSuggestionService _competitorService;
    private readonly IDiscoveryProgressNotifier _notifier;
    private readonly ILogger<RunDiscoveryJobHandler> _logger;

    public RunDiscoveryJobHandler(
        IAppDbContext db,
        IWebsiteDiscoveryService crawlService,
        IContentExtractor extractor,
        ICompetitorSuggestionService competitorService,
        IDiscoveryProgressNotifier notifier,
        ILogger<RunDiscoveryJobHandler> logger)
    {
        _db = db;
        _crawlService = crawlService;
        _extractor = extractor;
        _competitorService = competitorService;
        _notifier = notifier;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid brandId, Guid discoveryRunId, CancellationToken cancellationToken)
    {
        var run = await _db.DiscoveryRuns
            .FirstOrDefaultAsync(r => r.Id == discoveryRunId, cancellationToken)
            ?? throw new InvalidOperationException($"Discovery run {discoveryRunId} not found");

        var brand = await _db.Brands
            .FirstOrDefaultAsync(b => b.Id == brandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {brandId} not found");

        try
        {
            // Step 1: Crawl website
            run.Status = DiscoveryStatus.Crawling;
            await _db.SaveChangesAsync(cancellationToken);
            await _notifier.NotifyProgressAsync(brandId, DiscoveryStatus.Crawling, 0,
                "Scanning pages and extracting content...", step: 1, totalSteps: 5, cancellationToken: cancellationToken);

            var crawlResult = await _crawlService.CrawlWebsiteAsync(brand.WebsiteUrl, discoveryRunId, cancellationToken);

            foreach (var page in crawlResult.Pages)
            {
                page.DiscoveryRunId = discoveryRunId;
                _db.CrawledPages.Add(page);
            }
            run.PagesCrawled = crawlResult.TotalPagesCrawled;
            await _db.SaveChangesAsync(cancellationToken);

            // Steps 2-4: Extract (LlmContentExtractor sends step 2, 3, 4 internally)
            run.Status = DiscoveryStatus.Extracting;
            await _db.SaveChangesAsync(cancellationToken);
            await _notifier.NotifyProgressAsync(brandId, DiscoveryStatus.Extracting, crawlResult.TotalPagesCrawled,
                "Identifying brand identity and positioning...", step: 2, totalSteps: 5, cancellationToken: cancellationToken);

            var extractionResult = await _extractor.ExtractCandidatesAsync(brand, crawlResult.Pages, cancellationToken);

            if (extractionResult.BrandProfile != null)
            {
                extractionResult.BrandProfile.BrandId = brandId;
                _db.BrandProfiles.Add(extractionResult.BrandProfile);
            }

            foreach (var p in extractionResult.Products) { p.BrandId = brandId; p.DiscoveryRunId = discoveryRunId; _db.Products.Add(p); }
            foreach (var a in extractionResult.Audiences) { a.BrandId = brandId; a.DiscoveryRunId = discoveryRunId; _db.Audiences.Add(a); }
            foreach (var m in extractionResult.Markets) { m.BrandId = brandId; m.DiscoveryRunId = discoveryRunId; _db.Markets.Add(m); }
            foreach (var t in extractionResult.Topics) { t.BrandId = brandId; t.DiscoveryRunId = discoveryRunId; _db.Topics.Add(t); }
            foreach (var ts in extractionResult.TrustSignals) { ts.BrandId = brandId; ts.DiscoveryRunId = discoveryRunId; _db.TrustSignals.Add(ts); }
            await _db.SaveChangesAsync(cancellationToken);

            // Step 5: Competitor discovery
            await _notifier.NotifyProgressAsync(brandId, DiscoveryStatus.Extracting, crawlResult.TotalPagesCrawled,
                "Identifying competitive landscape...", step: 5, totalSteps: 5, cancellationToken: cancellationToken);
            var competitors = await _competitorService.SuggestCompetitorsAsync(
                brand.Name,
                extractionResult.BrandProfile?.Industry,
                extractionResult.BrandProfile?.Category,
                cancellationToken);

            foreach (var c in competitors) { c.BrandId = brandId; c.DiscoveryRunId = discoveryRunId; _db.Competitors.Add(c); }
            await _db.SaveChangesAsync(cancellationToken);

            // Complete
            run.Status = DiscoveryStatus.AwaitingConfirmation;
            run.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            await _notifier.NotifyProgressAsync(brandId, DiscoveryStatus.AwaitingConfirmation, crawlResult.TotalPagesCrawled,
                "Discovery complete", step: 5, totalSteps: 5, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Discovery run {RunId} for brand {BrandId} failed", discoveryRunId, brandId);
            run.Status = DiscoveryStatus.Failed;
            run.Error = ex.Message;
            run.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            await _notifier.NotifyProgressAsync(brandId, DiscoveryStatus.Failed, run.PagesCrawled,
                $"Discovery failed: {ex.Message}", step: 0, totalSteps: 5, cancellationToken: cancellationToken);
        }
    }
}
