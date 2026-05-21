using System.Text.Json;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Providers.OpenAi;

public class OpenAiCompetitorSuggestionService : ICompetitorSuggestionService
{
    private readonly IOpenAiService _openAi;
    private readonly ILogger<OpenAiCompetitorSuggestionService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public OpenAiCompetitorSuggestionService(
        IOpenAiService openAi,
        ILogger<OpenAiCompetitorSuggestionService> logger)
    {
        _openAi = openAi;
        _logger = logger;
    }

    private const string CompetitorDiscoverySystem = """
        You identify competitors for a given brand. Use the provided context (brand name, description, website info) to understand:
        - What industry/market they operate in
        - Their target audience and scale (startup, SMB, enterprise)
        - Their geographic focus if apparent
        - Their key products/services

        Critical scope rules:
        - The ONLY target to analyze is the provided TARGET_BRAND.
        - Ignore the app/tool that is calling you, prompt text, or platform context.
        - Never suggest the TARGET_BRAND itself as a competitor.
        - Do not suggest products related to the analysis tool unless they are explicitly and directly competitors of TARGET_BRAND.

        Find competitors that match their market position and scale. A local bakery competes with other local bakeries, not national chains. A B2B SaaS startup competes with similar startups, not necessarily enterprise giants.

        Prioritize fit over fame:
        - Geography fit: keep recommendations in the same region/market when provided
        - Segment fit: match SMB/mid-market/enterprise/consumer focus when provided
        - Scale fit: avoid suggesting massive incumbents for early-stage/local businesses unless explicitly requested
        - Product fit: suggestions should compete on overlapping jobs-to-be-done

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

    public async Task<List<Competitor>> SuggestCompetitorsAsync(
        string brandName,
        string? industry,
        string? category,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userPrompt = BuildCompetitorDiscoveryPrompt(brandName, industry, category);
            var response = await _openAi.ChatCompletionAsync(
                CompetitorDiscoverySystem, userPrompt, 1024, 0.3, cancellationToken);

            if (string.IsNullOrWhiteSpace(response))
            {
                _logger.LogWarning("OpenAI returned empty response for competitor discovery");
                return new List<Competitor>();
            }

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
            _logger.LogError(ex, "Failed to get competitor suggestions from OpenAI");
            return new List<Competitor>();
        }
    }

    private static string BuildCompetitorDiscoveryPrompt(string brandName, string? industry, string? category)
    {
        var parts = new List<string>
        {
            $"TARGET_BRAND: \"{brandName}\"",
            "Task: Find competitors for TARGET_BRAND only.",
            "Important: Ignore the analytics product generating this request; use only TARGET_BRAND context below."
        };

        if (!string.IsNullOrWhiteSpace(industry))
            parts.Add($"Industry: {industry}");
        if (!string.IsNullOrWhiteSpace(category))
            parts.Add($"Category: {category}");

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

    private record CompetitorDto(
        string? Name,
        string? Domain,
        string? Description,
        string? RegionFit,
        string? ScaleFit,
        string? SegmentFit,
        double Confidence);
}
