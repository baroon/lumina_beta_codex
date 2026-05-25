using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Providers.OpenAiCompatible;

public class GrokConfig
{
    public const string SectionName = "Grok";
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.x.ai/v1";
    public string Model { get; set; } = "grok-3";
}

public class GrokService : OpenAiCompatibleChatService, IGrokService
{
    private readonly GrokConfig _config;

    public GrokService(IOptions<GrokConfig> config, IHttpClientFactory httpClientFactory, ILogger<GrokService> logger)
        : base(httpClientFactory, logger)
    {
        _config = config.Value;
    }

    protected override string ProviderName => "Grok";
    protected override string HttpClientName => "Grok";
    protected override string ApiKey => _config.ApiKey;
    protected override string BaseUrl => _config.BaseUrl;
    protected override string Model => _config.Model;
}
