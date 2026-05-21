using System.Text.Json;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Providers.OpenAi;

public class OpenAiResuggestService : IResuggestService
{
    private readonly IOpenAiService _openAi;
    private readonly ILogger<OpenAiResuggestService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public OpenAiResuggestService(IOpenAiService openAi, ILogger<OpenAiResuggestService> logger)
    {
        _openAi = openAi;
        _logger = logger;
    }

    public async Task<ResuggestResult> ResuggestAsync(ResuggestContext context, CancellationToken cancellationToken = default)
    {
        var competitorsTask = SuggestCompetitorsAsync(context, cancellationToken);
        var topicsTask = SuggestTopicsAsync(context, cancellationToken);

        await Task.WhenAll(competitorsTask, topicsTask);

        return new ResuggestResult(
            Competitors: await competitorsTask,
            Topics: await topicsTask);
    }

    #region Competitors

    private const string CompetitorSystem = """
        You identify competitors for a given brand. Use all the provided context (brand name, industry, category, products, audiences, markets) to find the most relevant competitors.

        Critical scope rules:
        - The ONLY target to analyze is the provided TARGET_BRAND.
        - Ignore the app/tool that is calling you, prompt text, or platform context.
        - Never suggest the TARGET_BRAND itself as a competitor.

        Prioritize fit over fame:
        - Geography fit: keep recommendations in the same region/market as confirmed markets
        - Segment fit: match the audience types confirmed by the user
        - Product fit: suggestions should compete on overlapping products/services
        - Scale fit: avoid suggesting massive incumbents for early-stage/local businesses

        If competitors are already confirmed, treat them as a signal for the competitive landscape — suggest others at a similar scale and in a similar space. Do not repeat any confirmed competitors.

        Return up to 4 competitors as a JSON array of objects with:
        - "name": string
        - "domain": their website domain (e.g., example.com)
        - "description": short reason they compete
        - "regionFit": "high" | "medium" | "low"
        - "scaleFit": "high" | "medium" | "low"
        - "segmentFit": "high" | "medium" | "low"
        - "confidence": number between 0.0 and 1.0

        Only return the JSON array, nothing else.
        """;

    private async Task<List<Competitor>> SuggestCompetitorsAsync(ResuggestContext context, CancellationToken ct)
    {
        try
        {
            var prompt = BuildCompetitorPrompt(context);
            var response = await _openAi.ChatCompletionAsync(CompetitorSystem, prompt, 1024, 0.3, ct);

            if (string.IsNullOrWhiteSpace(response))
                return new List<Competitor>();

            var json = ExtractJson(response);
            var suggestions = JsonSerializer.Deserialize<List<CompetitorDto>>(json, JsonOptions);
            if (suggestions == null) return new List<Competitor>();

            return suggestions
                .Where(s => !string.IsNullOrWhiteSpace(s.Name))
                .Select(s => new Competitor
                {
                    Id = Guid.NewGuid(),
                    Name = s.Name!,
                    Domain = s.Domain,
                    Description = BuildCompetitorDescription(s),
                    Confidence = Math.Clamp(s.Confidence, 0.0, 1.0),
                    Source = CandidateSource.LLMSuggested,
                })
                .Take(4)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Resuggest: competitor suggestion failed");
            return new List<Competitor>();
        }
    }

    private static string BuildCompetitorPrompt(ResuggestContext ctx)
    {
        var parts = new List<string>
        {
            $"TARGET_BRAND: \"{ctx.BrandName}\"",
            "Task: Find competitors for TARGET_BRAND only.",
            "Important: Ignore the analytics product generating this request; use only TARGET_BRAND context below."
        };

        if (!string.IsNullOrWhiteSpace(ctx.Industry))
            parts.Add($"Industry: {ctx.Industry}");
        if (!string.IsNullOrWhiteSpace(ctx.Category))
            parts.Add($"Category: {ctx.Category}");
        if (ctx.Products.Count > 0)
            parts.Add($"Confirmed products/services: {string.Join(", ", ctx.Products)}");
        if (ctx.Audiences.Count > 0)
            parts.Add($"Confirmed target audiences: {string.Join(", ", ctx.Audiences)}");
        if (ctx.Markets.Count > 0)
            parts.Add($"Confirmed geographic markets: {string.Join(", ", ctx.Markets)}");
        if (ctx.Competitors is { Count: > 0 })
            parts.Add($"Already confirmed competitors (use as signal, suggest different ones): {string.Join(", ", ctx.Competitors)}");

        return string.Join("\n", parts);
    }

    private static string BuildCompetitorDescription(CompetitorDto dto)
    {
        var desc = dto.Description ?? "";
        var fits = new List<string>();
        if (!string.IsNullOrWhiteSpace(dto.RegionFit)) fits.Add($"Region: {dto.RegionFit}");
        if (!string.IsNullOrWhiteSpace(dto.ScaleFit)) fits.Add($"Scale: {dto.ScaleFit}");
        if (!string.IsNullOrWhiteSpace(dto.SegmentFit)) fits.Add($"Segment: {dto.SegmentFit}");

        if (fits.Count > 0)
            return $"{desc} [{string.Join(", ", fits)}]";
        return desc;
    }

    private record CompetitorDto(
        string? Name,
        string? Domain,
        string? Description,
        string? RegionFit,
        string? ScaleFit,
        string? SegmentFit,
        double Confidence);

    #endregion

    #region Topics

    private const string TopicSystem = """
        You suggest industry topics and themes for a brand's AI visibility monitoring. These are concise topic labels (2-5 words) representing the subject areas where the brand should be visible in AI-generated answers.

        Use the confirmed products, audiences, and markets to generate highly targeted topics.

        Good topics are short, descriptive labels like:
        - Industry verticals: "Commercial Interior Design", "Green Building"
        - Service areas: "Landscape Architecture", "Space Planning"
        - Domain expertise: "LEED Certification", "Sustainable Materials"
        - Market niches: "Luxury Residential Design", "Office Fit-Outs"

        Each topic should be a concise noun phrase (2-5 words), NOT a full search query or sentence. Do NOT include the brand name.

        If topics are already confirmed, treat them as a signal for the kind of subject areas that are relevant — suggest complementary topics covering different angles or specializations. Do not repeat any confirmed items.

        Return JSON only:
        ["Topic Name 1", "Topic Name 2", "Topic Name 3", "Topic Name 4"]
        """;

    private async Task<List<Topic>> SuggestTopicsAsync(ResuggestContext context, CancellationToken ct)
    {
        try
        {
            var prompt = BuildTopicPrompt(context);
            var response = await _openAi.ChatCompletionAsync(TopicSystem, prompt, 512, 0.5, ct);

            if (string.IsNullOrWhiteSpace(response))
                return new List<Topic>();

            var json = ExtractJson(response);
            var suggestions = JsonSerializer.Deserialize<List<string>>(json, JsonOptions);
            if (suggestions == null) return new List<Topic>();

            return suggestions
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => new Topic
                {
                    Id = Guid.NewGuid(),
                    Name = s.Trim(),
                    Confidence = 0.7,
                    Source = CandidateSource.LLMSuggested,
                })
                .Take(4)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Resuggest: topic suggestion failed");
            return new List<Topic>();
        }
    }

    private static string BuildTopicPrompt(ResuggestContext ctx)
    {
        var parts = new List<string> { $"Brand: \"{ctx.BrandName}\"" };

        if (!string.IsNullOrWhiteSpace(ctx.Industry))
            parts.Add($"Industry: {ctx.Industry}");
        if (!string.IsNullOrWhiteSpace(ctx.Category))
            parts.Add($"Category: {ctx.Category}");
        if (ctx.Products.Count > 0)
            parts.Add($"Confirmed products/services: {string.Join(", ", ctx.Products)}");
        if (ctx.Audiences.Count > 0)
            parts.Add($"Confirmed target audiences: {string.Join(", ", ctx.Audiences)}");
        if (ctx.Markets.Count > 0)
            parts.Add($"Confirmed geographic markets: {string.Join(", ", ctx.Markets)}");
        if (ctx.Topics is { Count: > 0 })
            parts.Add($"Already confirmed topics (use as signal, suggest different ones): {string.Join(", ", ctx.Topics)}");

        parts.Add("\nSuggest 4 industry topics or themes (2-5 words each) that represent the subject areas this brand should be visible in. Use confirmed products, audiences, and markets to identify relevant verticals, service areas, and domain expertise.");

        return string.Join("\n", parts);
    }

    #endregion

    #region Lens Regeneration

    public async Task<LensRegenerateResult> RegenerateLensAsync(
        ResuggestContext context, string lens, CancellationToken ct)
    {
        return lens.ToLowerInvariant() switch
        {
            "products" => await RegenerateProductsAsync(context, ct),
            "audiences" => await RegenerateAudiencesAsync(context, ct),
            "markets" => await RegenerateMarketsAsync(context, ct),
            "topics" => await RegenerateTopicsAsync(context, ct),
            "competitors" => await RegenerateCompetitorsAsync(context, ct),
            "trustsignals" => await RegenerateTrustSignalsAsync(context, ct),
            _ => throw new ArgumentException($"Unknown lens: {lens}")
        };
    }

    private async Task<LensRegenerateResult> RegenerateProductsAsync(ResuggestContext ctx, CancellationToken ct)
    {
        var system = """
            You suggest products and services for a brand based on its profile. Return your top 4 products/services, ranked by relevance.

            If products/services are already confirmed, treat them as a signal for the kind of offerings that are relevant — suggest complementary or related items the brand likely also offers. Do not repeat any confirmed items.

            Return JSON only:
            [{"name": "Product Name", "description": "Brief description", "confidence": 0.85}]
            """;

        var prompt = BuildLensPrompt(ctx, "Suggest 4 products or services this brand likely offers.");
        return await CallLensAsync(system, prompt, "LLMSuggested", ct);
    }

    private async Task<LensRegenerateResult> RegenerateAudiencesAsync(ResuggestContext ctx, CancellationToken ct)
    {
        var system = """
            You suggest target audiences for a brand based on its profile. Return your top 4 audience segments, ranked by relevance.

            If audiences are already confirmed, treat them as a signal for the kind of segments that are relevant — suggest complementary or adjacent audience segments. Do not repeat any confirmed items.

            Return JSON only:
            [{"name": "Audience Name", "description": "Brief description", "confidence": 0.80}]
            """;

        var prompt = BuildLensPrompt(ctx, "Suggest 4 target audience segments for this brand.");
        return await CallLensAsync(system, prompt, "LLMSuggested", ct);
    }

    private async Task<LensRegenerateResult> RegenerateMarketsAsync(ResuggestContext ctx, CancellationToken ct)
    {
        var system = """
            You suggest geographic markets for a brand based on its profile. Analyze the brand's industry, products, audiences, and any already-confirmed markets to infer where the brand operates or has strong potential.

            Consider:
            - Where the brand's industry typically operates (e.g., SaaS → global/US-first, local services → specific country/city)
            - Language and cultural fit with confirmed products and audiences
            - Natural expansion markets adjacent to already-confirmed markets
            - Industry-specific geographic hubs (e.g., fintech → US/UK/Singapore, automotive → Germany/Japan/US)

            If markets are already confirmed, treat them as a signal for where the brand operates — suggest adjacent or complementary geographic markets. Do not repeat any confirmed items.

            Return your top 4 markets as specific countries or well-defined regions, ranked by confidence. Avoid "Global" unless strong evidence supports it. Prefer countries over vague continental regions.

            Return JSON only:
            [{"name": "Market Name", "description": "Why this market fits", "confidence": 0.75}]
            """;

        var prompt = BuildLensPrompt(ctx, "Suggest 4 specific geographic markets (countries or well-defined regions) where this brand likely operates or should expand. Base your reasoning on the brand's industry, products, audiences, and existing markets. Explain why each market is a fit.");
        return await CallLensAsync(system, prompt, "LLMSuggested", ct);
    }

    private async Task<LensRegenerateResult> RegenerateTopicsAsync(ResuggestContext ctx, CancellationToken ct)
    {
        var prompt = BuildTopicPrompt(ctx);
        try
        {
            var response = await _openAi.ChatCompletionAsync(TopicSystem, prompt, 512, 0.5, ct);
            if (string.IsNullOrWhiteSpace(response))
                return new LensRegenerateResult(new List<LensCandidate>());

            var json = ExtractJson(response);
            var suggestions = JsonSerializer.Deserialize<List<string>>(json, JsonOptions);
            if (suggestions == null) return new LensRegenerateResult(new List<LensCandidate>());

            var candidates = suggestions
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => new LensCandidate(
                    Name: s.Trim(),
                    Description: null,
                    Confidence: 0.7,
                    Source: "LLMSuggested",
                    Metadata: new Dictionary<string, object?>()))
                .Take(4)
                .ToList();

            return new LensRegenerateResult(candidates);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RegenerateLens: topic regeneration failed");
            return new LensRegenerateResult(new List<LensCandidate>());
        }
    }

    private async Task<LensRegenerateResult> RegenerateCompetitorsAsync(ResuggestContext ctx, CancellationToken ct)
    {
        try
        {
            var prompt = BuildCompetitorPrompt(ctx);
            var response = await _openAi.ChatCompletionAsync(CompetitorSystem, prompt, 512, 0.5, ct);
            if (string.IsNullOrWhiteSpace(response))
                return new LensRegenerateResult(new List<LensCandidate>());

            var json = ExtractJson(response);
            var suggestions = JsonSerializer.Deserialize<List<CompetitorDto>>(json, JsonOptions);
            if (suggestions == null) return new LensRegenerateResult(new List<LensCandidate>());

            var candidates = suggestions
                .Where(s => !string.IsNullOrWhiteSpace(s.Name))
                .Select(s => new LensCandidate(
                    Name: s.Name!,
                    Description: BuildCompetitorDescription(s),
                    Confidence: Math.Clamp(s.Confidence, 0.0, 1.0),
                    Source: "LLMSuggested",
                    Metadata: new Dictionary<string, object?> { ["domain"] = s.Domain }))
                .Take(4)
                .ToList();

            return new LensRegenerateResult(candidates);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RegenerateLens: competitor regeneration failed");
            return new LensRegenerateResult(new List<LensCandidate>());
        }
    }

    private async Task<LensRegenerateResult> RegenerateTrustSignalsAsync(ResuggestContext ctx, CancellationToken ct)
    {
        var system = """
            You identify trust signals for a brand based on its profile. Trust signals are genuine credibility indicators. Each signal must be categorized into one of these types:

            - AwardsAndRecognitions: Industry awards, rankings, "Best of" lists
            - CertificationsAndAccreditations: ISO, SOC2, HIPAA, professional accreditations
            - PressAndMediaMentions: "As seen in", press coverage, media logos
            - TestimonialsAndReviews: Customer quotes, star ratings, review counts
            - ExpertEndorsements: Analyst recommendations, thought-leader quotes
            - CaseStudiesAndSuccessMetrics: Published case studies, ROI stats, success metrics
            - ClientAndPartnerLogos: "Trusted by" logo grids, partner badges, client lists

            If trust signals are already confirmed, treat them as a signal for the kind of credibility indicators that matter — suggest complementary or different trust signals. Do not repeat any confirmed items.

            Return your top 4 trust signals as a JSON array:
            [{"name": "Signal Name", "description": "What evidence supports this", "type": "TestimonialsAndReviews", "confidence": 0.75}]
            """;

        var prompt = BuildLensPrompt(ctx, "Suggest 4 trust signals this brand likely has or should highlight. Include a type field for each.");
        try
        {
            var response = await _openAi.ChatCompletionAsync(system, prompt, 512, 0.5, ct);
            if (string.IsNullOrWhiteSpace(response))
                return new LensRegenerateResult(new List<LensCandidate>());

            var json = ExtractJson(response);
            var items = JsonSerializer.Deserialize<List<TrustSignalLensDto>>(json, JsonOptions);
            if (items == null) return new LensRegenerateResult(new List<LensCandidate>());

            var candidates = items
                .Where(i => !string.IsNullOrWhiteSpace(i.Name))
                .Select(i => new LensCandidate(
                    Name: i.Name!,
                    Description: i.Description,
                    Confidence: Math.Clamp(i.Confidence, 0.0, 1.0),
                    Source: "LLMSuggested",
                    Metadata: new Dictionary<string, object?> { ["signalType"] = i.Type ?? "TestimonialsAndReviews" }))
                .Take(4)
                .ToList();

            return new LensRegenerateResult(candidates);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RegenerateLens: trust signal regeneration failed");
            return new LensRegenerateResult(new List<LensCandidate>());
        }
    }

    private record TrustSignalLensDto(string? Name, string? Description, string? Type, double Confidence);

    private async Task<LensRegenerateResult> CallLensAsync(
        string system, string prompt, string source, CancellationToken ct)
    {
        try
        {
            var response = await _openAi.ChatCompletionAsync(system, prompt, 512, 0.5, ct);
            if (string.IsNullOrWhiteSpace(response))
                return new LensRegenerateResult(new List<LensCandidate>());

            var json = ExtractJson(response);
            var items = JsonSerializer.Deserialize<List<LensCandidateDto>>(json, JsonOptions);
            if (items == null) return new LensRegenerateResult(new List<LensCandidate>());

            var candidates = items
                .Where(i => !string.IsNullOrWhiteSpace(i.Name))
                .Select(i => new LensCandidate(
                    Name: i.Name!,
                    Description: i.Description,
                    Confidence: Math.Clamp(i.Confidence, 0.0, 1.0),
                    Source: source,
                    Metadata: new Dictionary<string, object?>()))
                .Take(4)
                .ToList();

            return new LensRegenerateResult(candidates);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RegenerateLens: lens regeneration failed");
            return new LensRegenerateResult(new List<LensCandidate>());
        }
    }

    private static string BuildLensPrompt(ResuggestContext ctx, string instruction)
    {
        var parts = new List<string> { $"Brand: \"{ctx.BrandName}\"" };

        if (!string.IsNullOrWhiteSpace(ctx.Industry))
            parts.Add($"Industry: {ctx.Industry}");
        if (!string.IsNullOrWhiteSpace(ctx.Category))
            parts.Add($"Category: {ctx.Category}");
        if (ctx.Products.Count > 0)
            parts.Add($"Confirmed products/services: {string.Join(", ", ctx.Products)}");
        if (ctx.Audiences.Count > 0)
            parts.Add($"Confirmed target audiences: {string.Join(", ", ctx.Audiences)}");
        if (ctx.Markets.Count > 0)
            parts.Add($"Confirmed geographic markets: {string.Join(", ", ctx.Markets)}");
        if (ctx.Topics is { Count: > 0 })
            parts.Add($"Confirmed topics/search categories: {string.Join(", ", ctx.Topics)}");
        if (ctx.Competitors is { Count: > 0 })
            parts.Add($"Confirmed competitors: {string.Join(", ", ctx.Competitors)}");
        if (ctx.TrustSignals is { Count: > 0 })
            parts.Add($"Confirmed trust signals: {string.Join(", ", ctx.TrustSignals)}");

        parts.Add($"\n{instruction}");
        return string.Join("\n", parts);
    }

    private record LensCandidateDto(string? Name, string? Description, double Confidence);

    #endregion

    #region Helpers

    private static string ExtractJson(string response)
    {
        var trimmed = response.Trim();
        if (trimmed.StartsWith("```"))
        {
            var firstNewline = trimmed.IndexOf('\n');
            if (firstNewline > 0)
                trimmed = trimmed[(firstNewline + 1)..];
            if (trimmed.EndsWith("```"))
                trimmed = trimmed[..^3];
            trimmed = trimmed.Trim();
        }

        var arrStart = trimmed.IndexOf('[');
        if (arrStart >= 0)
        {
            var end = trimmed.LastIndexOf(']');
            if (end > arrStart)
                return trimmed[arrStart..(end + 1)];
        }

        return trimmed;
    }

    #endregion
}
