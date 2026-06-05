using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Providers.OpenAi;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Providers.OpenAiCompatible;

/// <summary>
/// Base for providers that expose an OpenAI-compatible /chat/completions endpoint (Grok, Perplexity,
/// and a configurable Copilot endpoint). Builds the same ProviderCompletionEnvelope shape as
/// OpenAiService — usage parsing is shared via OpenAiService.ReadOpenAiUsage since these providers
/// follow OpenAI's prompt_tokens / completion_tokens / total_tokens contract.
/// </summary>
public abstract class OpenAiCompatibleChatService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger _logger;

    protected OpenAiCompatibleChatService(IHttpClientFactory httpClientFactory, ILogger logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected abstract string ProviderName { get; }
    protected abstract string HttpClientName { get; }
    protected abstract string ApiKey { get; }
    protected abstract string BaseUrl { get; }
    protected abstract string Model { get; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(BaseUrl);

    public async Task<ProviderCompletionEnvelope> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default)
    {
        var startedAt = DateTime.UtcNow;
        var stopwatch = Stopwatch.StartNew();

        if (string.IsNullOrWhiteSpace(ApiKey) || string.IsNullOrWhiteSpace(BaseUrl))
        {
            _logger.LogWarning("{Provider} not configured (missing API key or base URL), skipping call", ProviderName);
            return ProviderCompletionEnvelope.Failure(
                ProviderName, Model, startedAt, DateTime.UtcNow,
                $"{ProviderName} not configured (missing API key or base URL)");
        }

        try
        {
            var client = _httpClientFactory.CreateClient(HttpClientName);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);

            var body = new
            {
                model = Model,
                max_tokens = maxTokens,
                temperature,
                messages = new object[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt },
                },
            };

            var url = $"{BaseUrl.TrimEnd('/')}/chat/completions";
            var response = await client.PostAsJsonAsync(url, body, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("{Provider} API returned {StatusCode}: {Error}", ProviderName, response.StatusCode, errorBody);
                return ProviderCompletionEnvelope.Failure(
                    ProviderName, Model, startedAt, DateTime.UtcNow,
                    $"HTTP {(int)response.StatusCode}: {errorBody}");
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            stopwatch.Stop();

            string text = string.Empty;
            string? finishReason = null;
            if (json.TryGetProperty("choices", out var choices)
                && choices.ValueKind == JsonValueKind.Array
                && choices.GetArrayLength() > 0)
            {
                var choice = choices[0];
                text = choice.GetProperty("message").GetProperty("content").GetString() ?? string.Empty;
                if (choice.TryGetProperty("finish_reason", out var fr))
                    finishReason = fr.GetString();
            }

            var model = json.TryGetProperty("model", out var m) ? m.GetString() ?? Model : Model;
            var (promptTokens, completionTokens, totalTokens) = OpenAiService.ReadOpenAiUsage(json);

            return new ProviderCompletionEnvelope(
                Provider: ProviderName,
                Model: model,
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
            _logger.LogWarning(ex, "{Provider} chat completion failed", ProviderName);
            return ProviderCompletionEnvelope.Failure(
                ProviderName, Model, startedAt, DateTime.UtcNow, ex.Message);
        }
    }
}
