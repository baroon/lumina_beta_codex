using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Providers.OpenAi;

public class OpenAiService : IOpenAiService
{
    private readonly OpenAiConfig _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OpenAiService> _logger;

    public OpenAiService(
        IOptions<OpenAiConfig> config,
        IHttpClientFactory httpClientFactory,
        ILogger<OpenAiService> logger)
    {
        _config = config.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_config.ApiKey);

    public async Task<ProviderCompletionEnvelope> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 2048,
        double temperature = 0.3,
        CancellationToken ct = default)
    {
        var startedAt = DateTime.UtcNow;
        var stopwatch = Stopwatch.StartNew();

        if (string.IsNullOrWhiteSpace(_config.ApiKey))
        {
            _logger.LogWarning("OpenAI API key not configured, skipping LLM call");
            return ProviderCompletionEnvelope.Failure(
                "OpenAI", _config.Model, startedAt, DateTime.UtcNow, "OpenAI API key not configured");
        }

        try
        {
            var client = _httpClientFactory.CreateClient("OpenAI");
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _config.ApiKey);

            var requestBody = new
            {
                model = _config.Model,
                max_tokens = maxTokens,
                temperature,
                messages = new object[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                }
            };

            var response = await client.PostAsJsonAsync(
                "https://api.openai.com/v1/chat/completions",
                requestBody,
                ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("OpenAI API returned {StatusCode}: {Error}", response.StatusCode, errorBody);
                return ProviderCompletionEnvelope.Failure(
                    "OpenAI", _config.Model, startedAt, DateTime.UtcNow,
                    $"HTTP {(int)response.StatusCode}: {errorBody}");
            }

            var responseJson = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            stopwatch.Stop();

            var choice = responseJson.GetProperty("choices")[0];
            var content = choice.GetProperty("message").GetProperty("content").GetString() ?? string.Empty;
            var finishReason = choice.TryGetProperty("finish_reason", out var fr) ? fr.GetString() : null;
            var model = responseJson.TryGetProperty("model", out var m) ? m.GetString() ?? _config.Model : _config.Model;
            var (promptTokens, completionTokens, totalTokens) = ReadOpenAiUsage(responseJson);

            return new ProviderCompletionEnvelope(
                Provider: "OpenAI",
                Model: model,
                StartedAt: startedAt,
                CompletedAt: DateTime.UtcNow,
                LatencyMs: (int)stopwatch.ElapsedMilliseconds,
                Text: content,
                FinishReason: finishReason,
                PromptTokens: promptTokens,
                CompletionTokens: completionTokens,
                TotalTokens: totalTokens,
                Error: null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI chat completion failed");
            return ProviderCompletionEnvelope.Failure(
                "OpenAI", _config.Model, startedAt, DateTime.UtcNow, ex.Message);
        }
    }

    // OpenAI returns usage as { prompt_tokens, completion_tokens, total_tokens }.
    // Reused by GrokService / PerplexityService / CopilotService via the
    // OpenAiCompatibleChatService base — kept internal to the OpenAI namespace
    // because the shape is OpenAI's contract, not ours.
    internal static (int? prompt, int? completion, int? total) ReadOpenAiUsage(JsonElement root)
    {
        if (!root.TryGetProperty("usage", out var usage) || usage.ValueKind != JsonValueKind.Object)
            return (null, null, null);
        int? Read(string name) =>
            usage.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : null;
        return (Read("prompt_tokens"), Read("completion_tokens"), Read("total_tokens"));
    }
}
