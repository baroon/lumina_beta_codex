using System.Net.Http.Json;
using System.Text.Json;
using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Providers.Gemini;

public class GeminiService : IGeminiService
{
    private readonly GeminiConfig _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(
        IOptions<GeminiConfig> config,
        IHttpClientFactory httpClientFactory,
        ILogger<GeminiService> logger)
    {
        _config = config.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<string> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_config.ApiKey))
        {
            _logger.LogWarning("Gemini API key not configured, skipping Gemini call");
            return string.Empty;
        }

        try
        {
            var client = _httpClientFactory.CreateClient("Gemini");
            var url =
                $"https://generativelanguage.googleapis.com/v1beta/models/{_config.Model}:generateContent?key={_config.ApiKey}";
            var requestBody = new
            {
                systemInstruction = new { parts = new[] { new { text = systemPrompt } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = userPrompt } } } },
                generationConfig = new { maxOutputTokens = maxTokens, temperature },
            };

            var response = await client.PostAsJsonAsync(url, requestBody, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Gemini API returned {StatusCode}: {Error}", response.StatusCode, errorBody);
                return string.Empty;
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            if (json.TryGetProperty("candidates", out var candidates)
                && candidates.ValueKind == JsonValueKind.Array
                && candidates.GetArrayLength() > 0)
            {
                var parts = candidates[0].GetProperty("content").GetProperty("parts");
                if (parts.ValueKind == JsonValueKind.Array && parts.GetArrayLength() > 0)
                    return parts[0].GetProperty("text").GetString() ?? string.Empty;
            }

            return string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini generation failed");
            return string.Empty;
        }
    }
}
