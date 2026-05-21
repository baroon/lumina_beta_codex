using System.Net.Http.Json;
using System.Text.Json;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Providers.Anthropic;

public class AnthropicCompetitorSuggestionService : ICompetitorSuggestionService
{
    private readonly AnthropicConfig _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AnthropicCompetitorSuggestionService> _logger;

    public AnthropicCompetitorSuggestionService(
        IOptions<AnthropicConfig> config,
        IHttpClientFactory httpClientFactory,
        ILogger<AnthropicCompetitorSuggestionService> logger)
    {
        _config = config.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<List<Competitor>> SuggestCompetitorsAsync(
        string brandName,
        string? industry,
        string? category,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_config.ApiKey))
        {
            _logger.LogWarning("Anthropic API key not configured, skipping competitor suggestions");
            return new List<Competitor>();
        }

        try
        {
            var client = _httpClientFactory.CreateClient("Anthropic");
            client.DefaultRequestHeaders.Add("x-api-key", _config.ApiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            var industryContext = !string.IsNullOrWhiteSpace(industry)
                ? $" in the {industry} industry"
                : "";
            var categoryContext = !string.IsNullOrWhiteSpace(category)
                ? $" ({category})"
                : "";

            var prompt = $@"List 5-8 competitors of ""{brandName}""{industryContext}{categoryContext}. For each competitor, provide:
- name: the company name
- domain: their website domain (e.g., example.com)
- description: a brief one-sentence description
- confidence: a number between 0.0 and 1.0 indicating how confident you are this is a real competitor

Return ONLY a valid JSON array, no other text. Example format:
[{{""name"":""Competitor"",""domain"":""competitor.com"",""description"":""A brief description"",""confidence"":0.8}}]";

            var requestBody = new
            {
                model = _config.Model,
                max_tokens = 1024,
                messages = new[]
                {
                    new { role = "user", content = prompt }
                }
            };

            var response = await client.PostAsJsonAsync(
                "https://api.anthropic.com/v1/messages",
                requestBody,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Anthropic API returned {StatusCode}: {Error}", response.StatusCode, errorBody);
                return new List<Competitor>();
            }

            var responseJson = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            var content = responseJson.GetProperty("content")[0].GetProperty("text").GetString();

            if (string.IsNullOrWhiteSpace(content))
                return new List<Competitor>();

            var suggestions = JsonSerializer.Deserialize<List<CompetitorSuggestion>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new List<CompetitorSuggestion>();

            return suggestions.Select(s => new Competitor
            {
                Id = Guid.NewGuid(),
                Name = s.Name,
                Domain = s.Domain,
                Description = s.Description,
                Confidence = Math.Clamp(s.Confidence, 0.0, 1.0),
                Source = CandidateSource.LLMSuggested,
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get competitor suggestions from Anthropic");
            return new List<Competitor>();
        }
    }

    private record CompetitorSuggestion(string Name, string Domain, string Description, double Confidence);
}
