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
                    Status = CandidateStatus.Suggested
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
        You suggest brand-discovery search categories for AI visibility monitoring. These represent the kinds of searches real people make when looking for a product, service, or company like the given brand - without knowing the brand by name.

        Use the confirmed products, audiences, and markets to generate highly targeted suggestions.

        Good suggestions are search categories like:
        - Market/service searches: "sustainable design firms in India"
        - Problem-solving searches: "companies that help with green building certification"
        - Recommendation searches: "best eco-friendly architecture firms"
        - Industry-specific searches: "LEED certified design consultants"
        - Comparison searches: "top residential interior designers in Mumbai"

        Each suggestion should be a natural search phrase (5-15 words) that someone would type into an AI assistant when looking for this type of brand. Include geographic or market context when relevant.
        Do NOT include the brand name in any suggestion.

        Return JSON only:
        ["search category 1", "search category 2", "search category 3", "search category 4"]
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
                    TopicType = TopicType.General,
                    Confidence = 0.7,
                    Source = CandidateSource.LLMSuggested,
                    Status = CandidateStatus.Suggested
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

        parts.Add("\nSuggest 4 discovery search categories -- the searches people would make when looking for a brand like this, without naming it directly. Incorporate the confirmed markets and audiences for geographic and demographic targeting.");

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

            Return JSON only:
            [{"name": "Audience Name", "description": "Brief description", "confidence": 0.80}]
            """;

        var prompt = BuildLensPrompt(ctx, "Suggest 4 target audience segments for this brand.");
        return await CallLensAsync(system, prompt, "LLMSuggested", ct);
    }

    private async Task<LensRegenerateResult> RegenerateMarketsAsync(ResuggestContext ctx, CancellationToken ct)
    {
        var system = """
            You suggest geographic markets for a brand based on its profile. Return your top 4 markets, ranked by confidence.

            Return JSON only:
            [{"name": "Market Name", "description": "Country or region", "confidence": 0.75}]
            """;

        var prompt = BuildLensPrompt(ctx, "Suggest 4 geographic markets where this brand likely operates or should expand.");
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
                    Metadata: new Dictionary<string, object?> { ["topicType"] = "General" }))
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
            You identify trust signals for a brand based on its profile. Trust signals are credibility indicators like pricing transparency, reviews, case studies, certifications, awards, partnerships, media mentions, security compliance, free trials, money-back guarantees, social proof, expert endorsements, privacy policies, and terms of service.

            Return your top 4 trust signals as a JSON array:
            [{"name": "Signal Name", "description": "What evidence supports this", "confidence": 0.75}]
            """;

        var prompt = BuildLensPrompt(ctx, "Suggest 4 trust signals this brand likely has or should highlight.");
        return await CallLensAsync(system, prompt, "LLMSuggested", ct);
    }

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
