using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Providers.Anthropic;

public class ClaudeService : IClaudeService
{
    private readonly AnthropicConfig _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ClaudeService> _logger;

    public ClaudeService(
        IOptions<AnthropicConfig> config,
        IHttpClientFactory httpClientFactory,
        ILogger<ClaudeService> logger)
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
            _logger.LogWarning("Anthropic API key not configured, skipping Claude call");
            return ProviderCompletionEnvelope.Failure(
                "Anthropic", _config.Model, startedAt, DateTime.UtcNow, "Anthropic API key not configured");
        }

        try
        {
            var client = _httpClientFactory.CreateClient("Anthropic");
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", _config.ApiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = JsonContent.Create(new
            {
                model = _config.Model,
                max_tokens = maxTokens,
                temperature,
                system = systemPrompt,
                messages = new object[] { new { role = "user", content = userPrompt } },
            });

            var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Anthropic API returned {StatusCode}: {Error}", response.StatusCode, errorBody);
                return ProviderCompletionEnvelope.Failure(
                    "Anthropic", _config.Model, startedAt, DateTime.UtcNow,
                    $"HTTP {(int)response.StatusCode}: {errorBody}");
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            stopwatch.Stop();

            // Anthropic returns content as an array of blocks (text, tool_use, etc.).
            // We use the first text block — Claude's chat-completion responses are
            // single-text-block in practice; tool_use blocks aren't requested.
            var text = string.Empty;
            if (json.TryGetProperty("content", out var content)
                && content.ValueKind == JsonValueKind.Array
                && content.GetArrayLength() > 0)
            {
                text = content[0].GetProperty("text").GetString() ?? string.Empty;
            }

            var stopReason = json.TryGetProperty("stop_reason", out var sr) ? sr.GetString() : null;
            var model = json.TryGetProperty("model", out var m) ? m.GetString() ?? _config.Model : _config.Model;
            // Anthropic usage shape: { input_tokens, output_tokens } — no aggregate field.
            int? promptTokens = null, completionTokens = null;
            if (json.TryGetProperty("usage", out var usage) && usage.ValueKind == JsonValueKind.Object)
            {
                if (usage.TryGetProperty("input_tokens", out var pt) && pt.ValueKind == JsonValueKind.Number)
                    promptTokens = pt.GetInt32();
                if (usage.TryGetProperty("output_tokens", out var ct) && ct.ValueKind == JsonValueKind.Number)
                    completionTokens = ct.GetInt32();
            }
            var totalTokens = (promptTokens ?? 0) + (completionTokens ?? 0);

            return new ProviderCompletionEnvelope(
                Provider: "Anthropic",
                Model: model,
                StartedAt: startedAt,
                CompletedAt: DateTime.UtcNow,
                LatencyMs: (int)stopwatch.ElapsedMilliseconds,
                Text: text,
                FinishReason: stopReason,
                PromptTokens: promptTokens,
                CompletionTokens: completionTokens,
                TotalTokens: totalTokens > 0 ? totalTokens : null,
                Error: null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude chat completion failed");
            return ProviderCompletionEnvelope.Failure(
                "Anthropic", _config.Model, startedAt, DateTime.UtcNow, ex.Message);
        }
    }
}
