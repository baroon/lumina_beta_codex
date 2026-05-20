using System.Text.Json;
using System.Text.RegularExpressions;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;

namespace AIVisibility.Infrastructure.Crawling;

public class HeuristicContentExtractor : IContentExtractor
{
    public Task<ExtractionResult> ExtractCandidatesAsync(Brand brand, List<CrawledPage> pages, CancellationToken cancellationToken = default)
    {
        var brandProfile = ExtractBrandProfile(brand, pages);
        var products = ExtractProducts(pages);
        var audiences = ExtractAudiences(pages);
        var markets = ExtractMarkets(brand, pages);
        var topics = ExtractTopics(pages);
        var trustSignals = ExtractTrustSignals(pages);

        return Task.FromResult(new ExtractionResult(brandProfile, products, audiences, markets, topics, trustSignals));
    }

    private static BrandProfile? ExtractBrandProfile(Brand brand, List<CrawledPage> pages)
    {
        var homepage = pages.FirstOrDefault(p => PagePriorityClassifier.Classify(p.Url) == PageCategory.Homepage);
        var aboutPage = pages.FirstOrDefault(p => PagePriorityClassifier.Classify(p.Url) == PageCategory.About);

        var description = homepage?.MetaDescription ?? aboutPage?.MetaDescription;
        if (string.IsNullOrWhiteSpace(description)) return null;

        string? industry = null;
        string? category = null;
        var headings = GetAllHeadingTexts(pages);

        // Simple industry detection from common keywords
        var industryKeywords = new Dictionary<string, string>
        {
            ["software"] = "Technology", ["saas"] = "Technology", ["tech"] = "Technology",
            ["health"] = "Healthcare", ["medical"] = "Healthcare", ["pharma"] = "Healthcare",
            ["finance"] = "Finance", ["banking"] = "Finance", ["fintech"] = "Finance",
            ["education"] = "Education", ["learning"] = "Education", ["elearning"] = "Education",
            ["retail"] = "Retail", ["ecommerce"] = "Retail", ["shop"] = "Retail",
            ["marketing"] = "Marketing", ["advertising"] = "Marketing", ["agency"] = "Marketing"
        };

        var allText = string.Join(" ", pages.Select(p => $"{p.Title} {p.MetaDescription}").Where(t => !string.IsNullOrEmpty(t))).ToLowerInvariant();
        foreach (var (keyword, ind) in industryKeywords)
        {
            if (allText.Contains(keyword))
            {
                industry = ind;
                break;
            }
        }

        return new BrandProfile
        {
            Id = Guid.NewGuid(),
            ShortDescription = description?.Length > 1000 ? description[..1000] : description,
            Industry = industry,
            Category = category,
            Positioning = headings.FirstOrDefault(),
            Confidence = description != null ? 0.7 : 0.3,
            Source = CandidateSource.WebsiteCrawl,
            Status = CandidateStatus.Suggested
        };
    }

    private static List<Product> ExtractProducts(List<CrawledPage> pages)
    {
        var products = new List<Product>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var page in pages)
        {
            var category = PagePriorityClassifier.Classify(page.Url);
            if (category != PageCategory.Product && category != PageCategory.Pricing && category != PageCategory.Homepage)
                continue;

            var headings = ParseHeadings(page.HeadingsJson);
            foreach (var heading in headings.Where(h => h.Tag == "h2" || h.Tag == "h3"))
            {
                var name = heading.Text.Trim();
                if (name.Length < 3 || name.Length > 100 || seen.Contains(name)) continue;
                if (IsGenericHeading(name)) continue;

                seen.Add(name);
                products.Add(new Product
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    ProductType = category == PageCategory.Pricing ? ProductType.Service : ProductType.Product,
                    RelatedPageUrl = page.Url,
                    Confidence = category == PageCategory.Product ? 0.7 : 0.5,
                    Source = CandidateSource.WebsiteCrawl,
                    Status = CandidateStatus.Suggested
                });
            }
        }

        return products.Take(4).ToList();
    }

    private static List<Audience> ExtractAudiences(List<CrawledPage> pages)
    {
        var audiences = new List<Audience>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var audiencePatterns = new[]
        {
            @"(?:for|designed for|built for|made for|perfect for|ideal for)\s+([^.,:]{3,60})",
            @"(?:teams|businesses|companies|professionals|developers|marketers|managers|enterprises|startups|agencies)"
        };

        var allText = string.Join(" ", pages.Select(p => $"{p.Title} {p.MetaDescription}").Where(t => !string.IsNullOrEmpty(t)));

        foreach (var pattern in audiencePatterns)
        {
            var matches = Regex.Matches(allText, pattern, RegexOptions.IgnoreCase);
            foreach (Match match in matches)
            {
                var name = match.Groups.Count > 1 ? match.Groups[1].Value.Trim() : match.Value.Trim();
                if (name.Length < 3 || name.Length > 100 || seen.Contains(name)) continue;
                seen.Add(name);

                audiences.Add(new Audience
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    Confidence = 0.5,
                    Source = CandidateSource.WebsiteCrawl,
                    Status = CandidateStatus.Suggested
                });
            }
        }

        return audiences.Take(4).ToList();
    }

    private static List<Market> ExtractMarkets(Brand brand, List<CrawledPage> pages)
    {
        var markets = new List<Market>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // TLD-based market detection (run once, not per-page)
        try
        {
            var uri = new Uri(brand.WebsiteUrl);
            var tld = uri.Host.Split('.').Last().ToUpperInvariant();
            var tldMarkets = new Dictionary<string, (string Name, string Code)>
            {
                ["COM"] = ("United States", "US"), ["CO"] = ("Colombia", "CO"),
                ["UK"] = ("United Kingdom", "GB"), ["DE"] = ("Germany", "DE"),
                ["FR"] = ("France", "FR"), ["AU"] = ("Australia", "AU"),
                ["CA"] = ("Canada", "CA"), ["IN"] = ("India", "IN"),
                ["JP"] = ("Japan", "JP"), ["BR"] = ("Brazil", "BR"),
                ["IO"] = ("United Kingdom", "GB"),
                ["NZ"] = ("New Zealand", "NZ"),
                ["SG"] = ("Singapore", "SG"),
                ["AE"] = ("United Arab Emirates", "AE"),
                ["ZA"] = ("South Africa", "ZA"),
                ["NL"] = ("Netherlands", "NL"),
                ["SE"] = ("Sweden", "SE"),
                ["CH"] = ("Switzerland", "CH"),
                ["ES"] = ("Spain", "ES"),
                ["IT"] = ("Italy", "IT"),
                ["MX"] = ("Mexico", "MX"),
                ["KR"] = ("South Korea", "KR")
            };

            if (tldMarkets.TryGetValue(tld, out var market) && !seen.Contains(market.Name))
            {
                seen.Add(market.Name);
                markets.Add(new Market
                {
                    Id = Guid.NewGuid(),
                    Name = market.Name,
                    MarketType = MarketType.Country,
                    CountryCode = market.Code,
                    Confidence = 0.6,
                    Source = CandidateSource.WebsiteCrawl,
                    Status = CandidateStatus.Suggested
                });
            }
        }
        catch { /* ignore URI parse errors */ }

        // Default global market if nothing detected
        if (markets.Count == 0)
        {
            markets.Add(new Market
            {
                Id = Guid.NewGuid(),
                Name = "Global",
                MarketType = MarketType.Global,
                Confidence = 0.4,
                Source = CandidateSource.WebsiteCrawl,
                Status = CandidateStatus.Suggested
            });
        }

        // Currency detection from page text (meta descriptions, titles, headings)
        var currencyMarkets = new Dictionary<string, (string Name, MarketType Type, string? Code, string Currency)>
        {
            ["€"] = ("Europe", MarketType.Region, null, "EUR"),
            ["£"] = ("United Kingdom", MarketType.Country, "GB", "GBP"),
            ["₹"] = ("India", MarketType.Country, "IN", "INR"),
            ["¥"] = ("Japan", MarketType.Country, "JP", "JPY"),
            ["₩"] = ("South Korea", MarketType.Country, "KR", "KRW"),
            ["R$"] = ("Brazil", MarketType.Country, "BR", "BRL"),
        };

        foreach (var page in pages.Take(3))
        {
            var textToScan = string.Join(" ", new[] { page.MetaDescription, page.Title }
                .Where(t => !string.IsNullOrWhiteSpace(t)));
            var headingTexts = ParseHeadings(page.HeadingsJson).Select(h => h.Text);
            textToScan += " " + string.Join(" ", headingTexts);

            foreach (var (symbol, cm) in currencyMarkets)
            {
                if (textToScan.Contains(symbol) && !seen.Contains(cm.Name))
                {
                    seen.Add(cm.Name);
                    markets.Add(new Market
                    {
                        Id = Guid.NewGuid(),
                        Name = cm.Name,
                        MarketType = cm.Type,
                        CountryCode = cm.Code,
                        CurrencyCode = cm.Currency,
                        Confidence = 0.5,
                        Source = CandidateSource.WebsiteCrawl,
                        Status = CandidateStatus.Suggested
                    });
                }
            }
        }

        return markets.Take(4).ToList();
    }

    private static List<Topic> ExtractTopics(List<CrawledPage> pages)
    {
        var topics = new List<Topic>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var page in pages)
        {
            var headings = ParseHeadings(page.HeadingsJson);
            foreach (var heading in headings.Where(h => h.Tag == "h1" || h.Tag == "h2"))
            {
                var text = heading.Text.Trim();
                if (text.Length < 3 || text.Length > 100 || seen.Contains(text)) continue;
                if (IsGenericHeading(text)) continue;

                seen.Add(text);
                var category = PagePriorityClassifier.Classify(page.Url);
                topics.Add(new Topic
                {
                    Id = Guid.NewGuid(),
                    Name = text,
                    TopicType = category == PageCategory.FAQ ? TopicType.General :
                                category == PageCategory.Product ? TopicType.ProductSpecific :
                                TopicType.General,
                    Confidence = heading.Tag == "h1" ? 0.6 : 0.4,
                    Source = CandidateSource.WebsiteCrawl,
                    Status = CandidateStatus.Suggested
                });
            }
        }

        return topics.Take(4).ToList();
    }

    private static List<TrustSignal> ExtractTrustSignals(List<CrawledPage> pages)
    {
        var signals = new List<TrustSignal>();
        var seen = new HashSet<TrustSignalType>();

        var urlPatterns = new Dictionary<string, TrustSignalType>
        {
            ["/pricing"] = TrustSignalType.PricingTransparency,
            ["/testimonial"] = TrustSignalType.ReviewsTestimonials,
            ["/review"] = TrustSignalType.ReviewsTestimonials,
            ["/case-stud"] = TrustSignalType.CaseStudies,
            ["/partner"] = TrustSignalType.Partnerships,
            ["/press"] = TrustSignalType.MediaMentions,
            ["/privacy"] = TrustSignalType.PrivacyPolicy,
            ["/terms"] = TrustSignalType.TermsOfService,
            ["/security"] = TrustSignalType.SecurityCompliance,
            ["/compliance"] = TrustSignalType.SecurityCompliance,
            ["/free-trial"] = TrustSignalType.FreeTrial,
            ["/trial"] = TrustSignalType.FreeTrial,
            ["/guarantee"] = TrustSignalType.MoneyBackGuarantee,
            ["/certification"] = TrustSignalType.Certifications,
            ["/award"] = TrustSignalType.Awards
        };

        foreach (var page in pages)
        {
            var path = new Uri(page.Url).AbsolutePath.ToLowerInvariant();
            foreach (var (pattern, signalType) in urlPatterns)
            {
                if (path.Contains(pattern) && !seen.Contains(signalType))
                {
                    seen.Add(signalType);
                    signals.Add(new TrustSignal
                    {
                        Id = Guid.NewGuid(),
                        SignalType = signalType,
                        Name = signalType.ToString(),
                        Description = $"Detected from page: {page.Url}",
                        SourcePagesJson = JsonSerializer.Serialize(new[] { page.Url }),
                        Confidence = 0.7,
                        Source = CandidateSource.WebsiteCrawl,
                        Status = CandidateStatus.Suggested
                    });
                }
            }

            // Check heading text for trust signal keywords
            var headings = ParseHeadings(page.HeadingsJson);
            var headingKeywords = new Dictionary<string, TrustSignalType>
            {
                ["testimonial"] = TrustSignalType.ReviewsTestimonials,
                ["review"] = TrustSignalType.ReviewsTestimonials,
                ["case study"] = TrustSignalType.CaseStudies,
                ["case studies"] = TrustSignalType.CaseStudies,
                ["partner"] = TrustSignalType.Partnerships,
                ["award"] = TrustSignalType.Awards,
                ["certif"] = TrustSignalType.Certifications,
                ["free trial"] = TrustSignalType.FreeTrial,
                ["money back"] = TrustSignalType.MoneyBackGuarantee,
                ["guarantee"] = TrustSignalType.MoneyBackGuarantee,
                ["social proof"] = TrustSignalType.SocialProof,
                ["trusted by"] = TrustSignalType.SocialProof
            };

            foreach (var heading in headings)
            {
                var lowerText = heading.Text.ToLowerInvariant();
                foreach (var (keyword, signalType) in headingKeywords)
                {
                    if (lowerText.Contains(keyword) && !seen.Contains(signalType))
                    {
                        seen.Add(signalType);
                        signals.Add(new TrustSignal
                        {
                            Id = Guid.NewGuid(),
                            SignalType = signalType,
                            Name = signalType.ToString(),
                            Description = $"Detected from heading: {heading.Text}",
                            SourcePagesJson = JsonSerializer.Serialize(new[] { page.Url }),
                            Confidence = 0.6,
                            Source = CandidateSource.WebsiteCrawl,
                            Status = CandidateStatus.Suggested
                        });
                    }
                }
            }
        }

        return signals.Take(4).ToList();
    }

    private static List<string> GetAllHeadingTexts(List<CrawledPage> pages)
    {
        return pages
            .SelectMany(p => ParseHeadings(p.HeadingsJson))
            .Where(h => h.Tag == "h1")
            .Select(h => h.Text)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .ToList();
    }

    private static List<(string Tag, string Text)> ParseHeadings(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<(string, string)>();
        try
        {
            var headings = JsonSerializer.Deserialize<List<HeadingEntry>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<HeadingEntry>();
            return headings.Select(h => (h.tag ?? "h2", h.text ?? "")).ToList();
        }
        catch { return new List<(string, string)>(); }
    }

    private record HeadingEntry(string? tag, string? text);

    private static bool IsGenericHeading(string text)
    {
        var generic = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "home", "about", "about us", "contact", "contact us", "get in touch",
            "pricing", "features", "blog", "news", "faq", "help", "support",
            "sign up", "sign in", "log in", "login", "register", "get started",
            "learn more", "read more", "see more", "view all", "subscribe",
            "privacy policy", "terms of service", "terms and conditions",
            "cookie policy", "menu", "navigation", "footer", "header"
        };
        return generic.Contains(text);
    }
}
