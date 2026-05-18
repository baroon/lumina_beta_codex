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

    public async Task<string> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 2048,
        double temperature = 0.3,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_config.ApiKey))
        {
            _logger.LogWarning("OpenAI API key not configured, skipping LLM call");
            return string.Empty;
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
                return string.Empty;
            }

            var responseJson = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

            var content = responseJson
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return content ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI chat completion failed");
            return string.Empty;
        }
    }
}
