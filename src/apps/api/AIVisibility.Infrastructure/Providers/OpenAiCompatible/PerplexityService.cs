using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Providers.OpenAiCompatible;

public class PerplexityConfig
{
    public const string SectionName = "Perplexity";
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.perplexity.ai";
    public string Model { get; set; } = "sonar";
}

public class PerplexityService : OpenAiCompatibleChatService, IPerplexityService
{
    private readonly PerplexityConfig _config;

    public PerplexityService(
        IOptions<PerplexityConfig> config,
        IHttpClientFactory httpClientFactory,
        ILogger<PerplexityService> logger)
        : base(httpClientFactory, logger)
    {
        _config = config.Value;
    }

    protected override string ProviderName => "Perplexity";
    protected override string HttpClientName => "Perplexity";
    protected override string ApiKey => _config.ApiKey;
    protected override string BaseUrl => _config.BaseUrl;
    protected override string Model => _config.Model;
}
