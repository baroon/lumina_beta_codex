using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Discovery;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Application.Commands.Discovery;

public class RunDiscoveryJobHandler : IRunDiscoveryJobHandler
{
    private readonly IAppDbContext _db;
    private readonly IWebsiteDiscoveryService _crawlService;
    private readonly IContentExtractor _extractor;
    private readonly IDiscoveryProgressNotifier _notifier;
    private readonly IDiscoveryDraftStore _draftStore;
    private readonly ILogger<RunDiscoveryJobHandler> _logger;

    public RunDiscoveryJobHandler(
        IAppDbContext db,
        IWebsiteDiscoveryService crawlService,
        IContentExtractor extractor,
        IDiscoveryProgressNotifier notifier,
        IDiscoveryDraftStore draftStore,
        ILogger<RunDiscoveryJobHandler> logger)
    {
        _db = db;
        _crawlService = crawlService;
        _extractor = extractor;
        _notifier = notifier;
        _draftStore = draftStore;
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

            // Steps 2-4: Extract (LlmContentExtractor emits step 2, 3, 4 internally)
            run.Status = DiscoveryStatus.Extracting;
            await _db.SaveChangesAsync(cancellationToken);
            await _notifier.NotifyProgressAsync(brandId, DiscoveryStatus.Extracting, crawlResult.TotalPagesCrawled,
                "Identifying brand identity and positioning...", step: 2, totalSteps: 5, cancellationToken: cancellationToken);

            var extraction = await _extractor.ExtractCandidatesAsync(brand, crawlResult.Pages, cancellationToken);

            // Suggestions are NOT persisted — only the user-confirmed set is (see ConfirmDiscovery).
            // Hand the draft to the confirmation wizard via the transient draft store; if it
            // expires or the app restarts, discovery is simply re-run.
            _draftStore.Save(discoveryRunId, BuildDraft(brand, extraction));

            // Step 5 progress — competitors will be generated during confirmation via resuggest
            await _notifier.NotifyProgressAsync(brandId, DiscoveryStatus.Extracting, crawlResult.TotalPagesCrawled,
                "Preparing competitive analysis...", step: 5, totalSteps: 5, cancellationToken: cancellationToken);
            await Task.Delay(3000, cancellationToken);

            // Extraction done — back-end work complete; wait for user confirm.
            run.Status = DiscoveryStatus.AwaitingConfirmation;
            run.ExtractedAt = DateTime.UtcNow;
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

    private static DiscoveryResultsDto BuildDraft(Brand brand, ExtractionResult extraction)
    {
        return new DiscoveryResultsDto(
            brand.Id,
            brand.Name,
            DiscoveryStatus.AwaitingConfirmation.ToString(),
            extraction.BrandProfile != null
                ? new BrandProfileDto(
                    extraction.BrandProfile.Id,
                    extraction.BrandProfile.ShortDescription,
                    extraction.BrandProfile.Industry,
                    extraction.BrandProfile.Category,
                    extraction.BrandProfile.Positioning,
                    extraction.BrandProfile.Confidence,
                    extraction.BrandProfile.Source.ToString())
                : null,
            extraction.Products.Select(p => ToCandidate(p.Id, p.Name, p.Description, p.Confidence, p.Source,
                new Dictionary<string, object?> { ["productType"] = p.ProductType.ToString() }, p.Aliases)).ToList(),
            extraction.Audiences.Select(a => ToCandidate(a.Id, a.Name, a.Description, a.Confidence, a.Source,
                new Dictionary<string, object?>())).ToList(),
            extraction.Markets.Select(m => ToCandidate(m.Id, m.Name, null, m.Confidence, m.Source,
                new Dictionary<string, object?> { ["countryCode"] = m.CountryCode })).ToList(),
            extraction.Topics.Select(t => ToCandidate(t.Id, t.Name, null, t.Confidence, t.Source,
                new Dictionary<string, object?>())).ToList(),
            new List<CandidateDto>(),
            extraction.TrustSignals.Select(ts => ToCandidate(ts.Id, ts.Name, ts.Description, ts.Confidence, ts.Source,
                new Dictionary<string, object?> { ["signalType"] = ts.SignalType.ToString() })).ToList(),
            brand.Aliases);
    }

    private static CandidateDto ToCandidate(Guid id, string name, string? description, double confidence,
        CandidateSource source, Dictionary<string, object?> metadata, List<string>? aliases = null)
        => new(id, name, description, confidence, source.ToString(), metadata, aliases);
}
