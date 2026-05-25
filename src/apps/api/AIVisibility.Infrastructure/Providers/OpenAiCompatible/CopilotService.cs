using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Providers.OpenAiCompatible;

public class CopilotConfig
{
    public const string SectionName = "Copilot";
    public string ApiKey { get; set; } = string.Empty;

    // Microsoft Copilot has no standard public chat API — point this at an OpenAI-compatible
    // endpoint (e.g. Azure OpenAI or GitHub Models). Left blank, Copilot stays "not configured".
    public string BaseUrl { get; set; } = string.Empty;
    public string Model { get; set; } = "gpt-4o";
}

public class CopilotService : OpenAiCompatibleChatService, ICopilotService
{
    private readonly CopilotConfig _config;

    public CopilotService(
        IOptions<CopilotConfig> config,
        IHttpClientFactory httpClientFactory,
        ILogger<CopilotService> logger)
        : base(httpClientFactory, logger)
    {
        _config = config.Value;
    }

    protected override string ProviderName => "Copilot";
    protected override string HttpClientName => "Copilot";
    protected override string ApiKey => _config.ApiKey;
    protected override string BaseUrl => _config.BaseUrl;
    protected override string Model => _config.Model;
}
