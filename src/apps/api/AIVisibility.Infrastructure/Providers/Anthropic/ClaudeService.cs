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

    public async Task<string> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_config.ApiKey))
        {
            _logger.LogWarning("Anthropic API key not configured, skipping Claude call");
            return string.Empty;
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
                return string.Empty;
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            if (json.TryGetProperty("content", out var content)
                && content.ValueKind == JsonValueKind.Array
                && content.GetArrayLength() > 0)
            {
                return content[0].GetProperty("text").GetString() ?? string.Empty;
            }

            return string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude chat completion failed");
            return string.Empty;
        }
    }
}
