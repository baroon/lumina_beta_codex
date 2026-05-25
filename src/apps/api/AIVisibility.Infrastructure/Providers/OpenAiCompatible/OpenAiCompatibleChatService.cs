using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Providers.OpenAiCompatible;

/// <summary>
/// Base for providers that expose an OpenAI-compatible /chat/completions endpoint (Grok, Perplexity,
/// and a configurable Copilot endpoint). Returns an empty string when unconfigured or on error.
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

    public async Task<string> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(ApiKey) || string.IsNullOrWhiteSpace(BaseUrl))
        {
            _logger.LogWarning("{Provider} not configured (missing API key or base URL), skipping call", ProviderName);
            return string.Empty;
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
                return string.Empty;
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            if (json.TryGetProperty("choices", out var choices)
                && choices.ValueKind == JsonValueKind.Array
                && choices.GetArrayLength() > 0)
            {
                return choices[0].GetProperty("message").GetProperty("content").GetString() ?? string.Empty;
            }

            return string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "{Provider} chat completion failed", ProviderName);
            return string.Empty;
        }
    }
}
