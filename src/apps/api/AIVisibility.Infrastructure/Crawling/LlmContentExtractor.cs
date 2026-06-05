using System.Text.Json;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Crawling;

public class LlmContentExtractor : IContentExtractor
{
    private readonly HeuristicContentExtractor _heuristic;
    private readonly IOpenAiService _openAi;
    private readonly IBlobStorageService _blobStorage;
    private readonly IDiscoveryProgressNotifier _notifier;
    private readonly ILogger<LlmContentExtractor> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public LlmContentExtractor(
        HeuristicContentExtractor heuristic,
        IOpenAiService openAi,
        IBlobStorageService blobStorage,
        IDiscoveryProgressNotifier notifier,
        ILogger<LlmContentExtractor> logger)
    {
        _heuristic = heuristic;
        _openAi = openAi;
        _blobStorage = blobStorage;
        _notifier = notifier;
        _logger = logger;
    }

    public async Task<ExtractionResult> ExtractCandidatesAsync(
        Brand brand, List<CrawledPage> pages, CancellationToken cancellationToken = default)
    {
        // Always get heuristic baseline first
        var baseline = await _heuristic.ExtractCandidatesAsync(brand, pages, cancellationToken);

        // Load page text from blob storage for LLM prompts
        var pageTexts = await LoadPageTextsAsync(pages, cancellationToken);

        // Call 1: Brand Analysis (step 2)
        var brandProfile = await ExtractBrandProfileAsync(brand, pages, pageTexts, baseline.BrandProfile, cancellationToken);

        // Call 2: Full Discovery Extraction (step 3)
        await _notifier.NotifyProgressAsync(brand.Id, Domain.Enums.DiscoveryStatus.Extracting, 0,
            "Discovering products, audiences, and markets...", step: 3, totalSteps: 5, cancellationToken: cancellationToken);
        var (products, audiences, markets, trustSignals) = await ExtractEntitiesAsync(
            brand, brandProfile, pages, pageTexts, baseline, cancellationToken);

        // Step 4 progress — topics will be generated during confirmation via resuggest
        await _notifier.NotifyProgressAsync(brand.Id, Domain.Enums.DiscoveryStatus.Extracting, 0,
            "Preparing topic suggestions...", step: 4, totalSteps: 5, cancellationToken: cancellationToken);
        await Task.Delay(4000, cancellationToken);

        return new ExtractionResult(
            brandProfile,
            products,
            audiences,
            markets,
            new List<Topic>(),
            trustSignals);
    }

    #region Page Text Loading

    private async Task<Dictionary<string, string>> LoadPageTextsAsync(
        List<CrawledPage> pages, CancellationToken ct)
    {
        var texts = new Dictionary<string, string>();
        foreach (var page in pages)
        {
            if (string.IsNullOrWhiteSpace(page.ExtractedTextBlobRef)) continue;
            try
            {
                var text = await _blobStorage.DownloadTextAsync("crawled-pages", page.ExtractedTextBlobRef, ct);
                if (!string.IsNullOrWhiteSpace(text))
                    texts[page.Url] = text;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load page text for {Url}", page.Url);
            }
        }
        return texts;
    }

    #endregion

    #region Call 1: Brand Analysis

    private const string BrandAnalysisSystem = """
        You are a brand analyst. Given a brand name and scraped website content (or just a brand name), produce a comprehensive brand description and confidence score.

        Your description should be 2-4 sentences that capture:
        1. What the brand does (core product/service)
        2. Their key capability or differentiator
        3. Their market category or industry
        4. Their positioning or target audience

        Return JSON only:
        {
          "description": "A comprehensive 2-4 sentence brand description...",
          "industry": "Technology",
          "category": "SaaS",
          "positioning": "Short positioning statement",
          "confidence": 88,
          "pagesUsed": ["https://example.com (Homepage)", "https://example.com/about (About Us)"]
        }

        Confidence scoring guidelines:
        - 85-100: Rich website content with clear brand messaging across multiple pages
        - 70-84: Good website content but some areas unclear
        - 50-69: Limited website content or only homepage available
        - 30-49: No website, working from brand name and general knowledge only
        - 0-29: Brand name is ambiguous or unrecognizable

        Be factual and specific. Do not invent capabilities not evidenced in the content.
        """;

    private static string BuildBrandAnalysisPrompt(Brand brand, List<CrawledPage> pages, Dictionary<string, string> pageTexts)
    {
        var homepage = pages.FirstOrDefault(p => PagePriorityClassifier.Classify(p.Url) == PageCategory.Homepage);
        var aboutPage = pages.FirstOrDefault(p => PagePriorityClassifier.Classify(p.Url) == PageCategory.About);
        var primaryPage = homepage ?? pages.FirstOrDefault();

        var parts = new List<string> { $"Brand: \"{brand.Name}\"" };

        if (primaryPage != null)
        {
            parts.Add($"Website: {primaryPage.Url}");
            if (!string.IsNullOrWhiteSpace(primaryPage.Title))
                parts.Add($"Page title: {primaryPage.Title}");
            if (!string.IsNullOrWhiteSpace(primaryPage.MetaDescription))
                parts.Add($"Meta description: {primaryPage.MetaDescription}");

            var headings = ParseHeadings(primaryPage.HeadingsJson);
            var h1s = headings.Where(h => h.Tag == "h1").Select(h => h.Text).ToList();
            var h2s = headings.Where(h => h.Tag == "h2").Select(h => h.Text).ToList();
            if (h1s.Count > 0) parts.Add($"H1 headings: {string.Join(", ", h1s)}");
            if (h2s.Count > 0) parts.Add($"H2 headings: {string.Join(", ", h2s)}");

            if (pageTexts.TryGetValue(primaryPage.Url, out var homepageText))
                parts.Add($"\n--- Homepage body text ---\n{Truncate(homepageText, 3000)}");
        }

        // Add additional pages (about, product, etc.)
        var additionalPages = pages
            .Where(p => p != primaryPage && p != null)
            .OrderByDescending(p => PagePriorityClassifier.GetPriority(p.Url))
            .Take(3);

        foreach (var page in additionalPages)
        {
            parts.Add($"\n--- {page.Title ?? page.Url} ---");
            parts.Add($"URL: {page.Url}");
            if (pageTexts.TryGetValue(page.Url, out var text))
                parts.Add(Truncate(text, 1500));
        }

        parts.Add("\nAnalyze this brand and produce a comprehensive description with confidence score. Include the URLs/titles of pages you found most useful in pagesUsed.");
        return string.Join("\n", parts);
    }

    private async Task<BrandProfile?> ExtractBrandProfileAsync(
        Brand brand, List<CrawledPage> pages, Dictionary<string, string> pageTexts,
        BrandProfile? heuristicProfile, CancellationToken ct)
    {
        try
        {
            var userPrompt = BuildBrandAnalysisPrompt(brand, pages, pageTexts);
            var response = (await _openAi.ChatCompletionAsync(BrandAnalysisSystem, userPrompt, 1024, 0.3, ct)).Text;

            if (string.IsNullOrWhiteSpace(response))
                return heuristicProfile;

            var json = ExtractJson(response);
            var result = JsonSerializer.Deserialize<BrandAnalysisResponse>(json, JsonOptions);

            if (result == null || string.IsNullOrWhiteSpace(result.Description))
                return heuristicProfile;

            return new BrandProfile
            {
                Id = Guid.NewGuid(),
                ShortDescription = Truncate(result.Description, 1000),
                Industry = result.Industry,
                Category = result.Category,
                Positioning = result.Positioning,
                Confidence = Math.Clamp(result.Confidence / 100.0, 0.0, 1.0),
                Source = CandidateSource.LLMSuggested,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM brand analysis failed, using heuristic fallback");
            return heuristicProfile;
        }
    }

    private record BrandAnalysisResponse(
        string? Description, string? Industry, string? Category,
        string? Positioning, int Confidence, List<string>? PagesUsed);

    #endregion

    #region Call 2: Entity Extraction

    private const string EntityExtractionSystem = """
        You are a business analyst extracting structured data from website content. Given a brand description and crawled website content, extract:

        1. Products/Services: What the brand sells or offers
        2. Target Audiences: Who the brand serves
        3. Markets: Geographic markets the brand operates in
        4. Trust Signals: Credibility indicators found on the website

        Return JSON only:
        {
          "products": [
            {"name": "Product Name", "description": "Brief description", "type": "Product|Service|Feature|Solution|Tool|Resource", "confidence": 85}
          ],
          "audiences": [
            {"name": "Audience Name", "description": "Brief description", "confidence": 80}
          ],
          "markets": [
            {"name": "Market Name", "type": "Country|Region|City|Global", "countryCode": "US", "confidence": 75}
          ],
          "trustSignals": [
            {"name": "Signal Name", "description": "What was found", "type": "AwardsAndRecognitions|CertificationsAndAccreditations|PressAndMediaMentions|TestimonialsAndReviews|ExpertEndorsements|CaseStudiesAndSuccessMetrics|ClientAndPartnerLogos", "confidence": 75}
          ]
        }

        Guidelines:
        - Products: Include actual products/services/features. Return your top 4, ranked by relevance. Be specific, not generic.
        - Audiences: Include distinct customer segments. Return your top 4, ranked by relevance. Use descriptive names like "Small Business Owners" not just "businesses".
        - Markets: Identify geographic markets where the brand operates. Look for these signals:
          * Physical addresses, phone numbers with country codes, office locations
          * Shipping/delivery regions, service areas mentioned on the site
          * Currency symbols or pricing in specific currencies (€, £, ₹, etc.)
          * Language-specific content or locale selectors (e.g., "EN-US", "DE", "/fr/")
          * Regional compliance mentions (GDPR → EU, SOC2 → US, etc.)
          * "Available in" or "Serving customers in" statements
          * Country-specific case studies, testimonials, or customer logos
          * Job postings mentioning office locations
          If no clear geographic signals exist, infer from the website TLD, content language, and industry norms. Return your top 4, ranked by confidence. Use ISO country codes when applicable. Prefer specific countries over vague regions like "Global" unless the brand genuinely operates worldwide with evidence.
        - Trust Signals: Look for genuine credibility indicators on the website. Categorize each signal:
          * AwardsAndRecognitions: Industry awards, rankings, "Best of" lists
          * CertificationsAndAccreditations: ISO, SOC2, HIPAA, professional accreditations
          * PressAndMediaMentions: "As seen in", press coverage, media logos
          * TestimonialsAndReviews: Customer quotes, star ratings, review counts
          * ExpertEndorsements: Analyst recommendations, thought-leader quotes
          * CaseStudiesAndSuccessMetrics: Published case studies, ROI stats, success metrics
          * ClientAndPartnerLogos: "Trusted by" logo grids, partner badges, client lists
          Return your top 4. Include specific evidence (e.g., "Trusted by 500+ companies" not just a generic label).
        - Confidence: 0-100 scale. Higher = more evidence in the content.
        - Be factual. Only include items evidenced in the content.
        """;

    private static string BuildEntityExtractionPrompt(
        Brand brand, BrandProfile? profile, List<CrawledPage> pages, Dictionary<string, string> pageTexts)
    {
        var parts = new List<string>
        {
            $"Brand: \"{brand.Name}\"",
            $"Website: {brand.WebsiteUrl}"
        };

        if (profile != null)
        {
            if (!string.IsNullOrWhiteSpace(profile.ShortDescription))
                parts.Add($"Brand Description: {profile.ShortDescription}");
            if (!string.IsNullOrWhiteSpace(profile.Industry))
                parts.Add($"Industry: {profile.Industry}");
            if (!string.IsNullOrWhiteSpace(profile.Category))
                parts.Add($"Category: {profile.Category}");
        }

        // Surface website TLD as a geographic hint
        try
        {
            var uri = new Uri(brand.WebsiteUrl);
            var tld = uri.Host.Split('.').Last().ToUpperInvariant();
            parts.Add($"Website TLD: .{tld}");
        }
        catch { /* ignore */ }

        // Include content from top pages
        var topPages = pages
            .OrderByDescending(p => PagePriorityClassifier.GetPriority(p.Url))
            .Take(5)
            .ToList();

        foreach (var page in topPages)
        {
            parts.Add($"\n--- {page.Title ?? page.Url} ---");
            if (!string.IsNullOrWhiteSpace(page.MetaDescription))
                parts.Add($"Meta: {page.MetaDescription}");

            var headings = ParseHeadings(page.HeadingsJson);
            if (headings.Count > 0)
                parts.Add($"Headings: {string.Join(", ", headings.Select(h => h.Text))}");

            if (pageTexts.TryGetValue(page.Url, out var text))
                parts.Add(Truncate(text, 1500));
        }

        // Include contact page for geographic signals (addresses, phone numbers)
        var contactPage = pages.FirstOrDefault(p =>
            PagePriorityClassifier.Classify(p.Url) == PageCategory.Contact);
        var includedUrls = topPages.Select(p => p.Url).ToHashSet();
        if (contactPage != null && !includedUrls.Contains(contactPage.Url))
        {
            parts.Add($"\n--- {contactPage.Title ?? contactPage.Url} (Contact) ---");
            if (!string.IsNullOrWhiteSpace(contactPage.MetaDescription))
                parts.Add($"Meta: {contactPage.MetaDescription}");
            if (pageTexts.TryGetValue(contactPage.Url, out var contactText))
                parts.Add(Truncate(contactText, 1000));
        }

        parts.Add("\nExtract all products/services, target audiences, markets, and trust signals from this brand's website content.");
        return string.Join("\n", parts);
    }

    private async Task<(List<Product>, List<Audience>, List<Market>, List<TrustSignal>)> ExtractEntitiesAsync(
        Brand brand, BrandProfile? profile, List<CrawledPage> pages,
        Dictionary<string, string> pageTexts, ExtractionResult baseline, CancellationToken ct)
    {
        try
        {
            var userPrompt = BuildEntityExtractionPrompt(brand, profile, pages, pageTexts);
            var response = (await _openAi.ChatCompletionAsync(EntityExtractionSystem, userPrompt, 1024, 0.3, ct)).Text;

            if (string.IsNullOrWhiteSpace(response))
                return (baseline.Products, baseline.Audiences, baseline.Markets, baseline.TrustSignals);

            var json = ExtractJson(response);
            var result = JsonSerializer.Deserialize<EntityExtractionResponse>(json, JsonOptions);

            if (result == null)
                return (baseline.Products, baseline.Audiences, baseline.Markets, baseline.TrustSignals);

            var products = MapProducts(result.Products);
            var audiences = MapAudiences(result.Audiences);
            var markets = MapMarkets(result.Markets);
            var trustSignals = MapTrustSignals(result.TrustSignals);

            // Use LLM results if non-empty, otherwise fall back to heuristic
            return (
                products.Count > 0 ? products : baseline.Products,
                audiences.Count > 0 ? audiences : baseline.Audiences,
                markets.Count > 0 ? markets : baseline.Markets,
                trustSignals.Count > 0 ? trustSignals : baseline.TrustSignals
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM entity extraction failed, using heuristic fallback");
            return (baseline.Products, baseline.Audiences, baseline.Markets, baseline.TrustSignals);
        }
    }

    private static List<Product> MapProducts(List<ProductDto>? dtos)
    {
        if (dtos == null) return new List<Product>();
        return dtos
            .Where(d => !string.IsNullOrWhiteSpace(d.Name))
            .Select(d => new Product
            {
                Id = Guid.NewGuid(),
                Name = d.Name!,
                Description = d.Description,
                ProductType = ParseEnum(d.Type, ProductType.Product),
                Confidence = Math.Clamp(d.Confidence / 100.0, 0.0, 1.0),
                Source = CandidateSource.LLMSuggested,
            })
            .Take(4)
            .ToList();
    }

    private static List<Audience> MapAudiences(List<AudienceDto>? dtos)
    {
        if (dtos == null) return new List<Audience>();
        return dtos
            .Where(d => !string.IsNullOrWhiteSpace(d.Name))
            .Select(d => new Audience
            {
                Id = Guid.NewGuid(),
                Name = d.Name!,
                Description = d.Description,
                Confidence = Math.Clamp(d.Confidence / 100.0, 0.0, 1.0),
                Source = CandidateSource.LLMSuggested,
            })
            .Take(4)
            .ToList();
    }

    private static List<Market> MapMarkets(List<MarketDto>? dtos)
    {
        if (dtos == null) return new List<Market>();
        return dtos
            .Where(d => !string.IsNullOrWhiteSpace(d.Name))
            .Select(d => new Market
            {
                Id = Guid.NewGuid(),
                Name = d.Name!,
                CountryCode = d.CountryCode,
                Confidence = Math.Clamp(d.Confidence / 100.0, 0.0, 1.0),
                Source = CandidateSource.LLMSuggested,
            })
            .Take(4)
            .ToList();
    }

    private static List<TrustSignal> MapTrustSignals(List<TrustSignalDto>? dtos)
    {
        if (dtos == null) return new List<TrustSignal>();
        return dtos
            .Where(d => !string.IsNullOrWhiteSpace(d.Name))
            .Select(d => new TrustSignal
            {
                Id = Guid.NewGuid(),
                SignalType = ParseEnum(d.Type, TrustSignalType.TestimonialsAndReviews),
                Name = d.Name!,
                Description = d.Description,
                Confidence = Math.Clamp(d.Confidence / 100.0, 0.0, 1.0),
                Source = CandidateSource.LLMSuggested,
            })
            .Take(4)
            .ToList();
    }

    private record EntityExtractionResponse(
        List<ProductDto>? Products,
        List<AudienceDto>? Audiences,
        List<MarketDto>? Markets,
        List<TrustSignalDto>? TrustSignals);

    private record ProductDto(string? Name, string? Description, string? Type, int Confidence);
    private record AudienceDto(string? Name, string? Description, int Confidence);
    private record MarketDto(string? Name, string? CountryCode, int Confidence);
    private record TrustSignalDto(string? Name, string? Description, string? Type, int Confidence);

    #endregion

    #region Helpers

    private static List<(string Tag, string Text)> ParseHeadings(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<(string, string)>();
        try
        {
            var headings = JsonSerializer.Deserialize<List<HeadingEntry>>(json, JsonOptions);
            return headings?.Select(h => (h.Tag ?? "h2", h.Text ?? "")).ToList()
                   ?? new List<(string, string)>();
        }
        catch { return new List<(string, string)>(); }
    }

    private record HeadingEntry(string? Tag, string? Text);

    private static string Truncate(string text, int maxLength)
    {
        return text.Length <= maxLength ? text : text[..maxLength] + "...";
    }

    /// <summary>
    /// Extracts the first JSON object or array from a response string that may contain
    /// markdown fences or surrounding text.
    /// </summary>
    private static string ExtractJson(string response)
    {
        var trimmed = response.Trim();

        // Strip markdown code fences
        if (trimmed.StartsWith("```"))
        {
            var firstNewline = trimmed.IndexOf('\n');
            if (firstNewline > 0)
                trimmed = trimmed[(firstNewline + 1)..];
            if (trimmed.EndsWith("```"))
                trimmed = trimmed[..^3];
            trimmed = trimmed.Trim();
        }

        // Find first { or [ and last } or ]
        var objStart = trimmed.IndexOf('{');
        var arrStart = trimmed.IndexOf('[');

        if (objStart < 0 && arrStart < 0)
            return trimmed;

        if (objStart >= 0 && (arrStart < 0 || objStart < arrStart))
        {
            var end = trimmed.LastIndexOf('}');
            return end > objStart ? trimmed[objStart..(end + 1)] : trimmed;
        }
        else
        {
            var end = trimmed.LastIndexOf(']');
            return end > arrStart ? trimmed[arrStart..(end + 1)] : trimmed;
        }
    }

    private static T ParseEnum<T>(string? value, T defaultValue) where T : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(value)) return defaultValue;
        return Enum.TryParse<T>(value, ignoreCase: true, out var result) ? result : defaultValue;
    }

    #endregion
}
