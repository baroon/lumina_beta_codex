using System.Diagnostics;
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

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_config.ApiKey);

    public async Task<ProviderCompletionEnvelope> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default)
    {
        var startedAt = DateTime.UtcNow;
        var stopwatch = Stopwatch.StartNew();

        if (string.IsNullOrWhiteSpace(_config.ApiKey))
        {
            _logger.LogWarning("Gemini API key not configured, skipping Gemini call");
            return ProviderCompletionEnvelope.Failure(
                "Gemini", _config.Model, startedAt, DateTime.UtcNow, "Gemini API key not configured");
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
                return ProviderCompletionEnvelope.Failure(
                    "Gemini", _config.Model, startedAt, DateTime.UtcNow,
                    $"HTTP {(int)response.StatusCode}: {errorBody}");
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            stopwatch.Stop();

            string text = string.Empty;
            string? finishReason = null;
            if (json.TryGetProperty("candidates", out var candidates)
                && candidates.ValueKind == JsonValueKind.Array
                && candidates.GetArrayLength() > 0)
            {
                var candidate = candidates[0];
                if (candidate.TryGetProperty("content", out var content)
                    && content.TryGetProperty("parts", out var parts)
                    && parts.ValueKind == JsonValueKind.Array
                    && parts.GetArrayLength() > 0)
                {
                    text = parts[0].GetProperty("text").GetString() ?? string.Empty;
                }
                if (candidate.TryGetProperty("finishReason", out var fr))
                    finishReason = fr.GetString();
            }

            // Gemini usage shape: usageMetadata { promptTokenCount, candidatesTokenCount, totalTokenCount }.
            int? promptTokens = null, completionTokens = null, totalTokens = null;
            if (json.TryGetProperty("usageMetadata", out var usage) && usage.ValueKind == JsonValueKind.Object)
            {
                int? Read(string name) =>
                    usage.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : null;
                promptTokens = Read("promptTokenCount");
                completionTokens = Read("candidatesTokenCount");
                totalTokens = Read("totalTokenCount");
            }

            return new ProviderCompletionEnvelope(
                Provider: "Gemini",
                Model: _config.Model,
                StartedAt: startedAt,
                CompletedAt: DateTime.UtcNow,
                LatencyMs: (int)stopwatch.ElapsedMilliseconds,
                Text: text,
                FinishReason: finishReason,
                PromptTokens: promptTokens,
                CompletionTokens: completionTokens,
                TotalTokens: totalTokens,
                Error: null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini generation failed");
            return ProviderCompletionEnvelope.Failure(
                "Gemini", _config.Model, startedAt, DateTime.UtcNow, ex.Message);
        }
    }
}
