using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Analysis;
using AIVisibility.Infrastructure.Crawling;
using AIVisibility.Infrastructure.Data;
using AIVisibility.Infrastructure.Discovery;
using AIVisibility.Infrastructure.Prompts;
using AIVisibility.Infrastructure.Scanning;
using AIVisibility.Infrastructure.Providers.Anthropic;
using AIVisibility.Infrastructure.Providers.Gemini;
using AIVisibility.Infrastructure.Providers.OpenAi;
using AIVisibility.Infrastructure.Providers.OpenAiCompatible;
using AIVisibility.Infrastructure.Storage;
using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AIVisibility.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Database
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        // Azure Blob Storage
        var storageConnectionString = configuration.GetSection("AzureStorage:ConnectionString").Value
            ?? "UseDevelopmentStorage=true";
        services.AddSingleton(new BlobServiceClient(storageConnectionString));
        services.AddScoped<IBlobStorageService, AzureBlobStorageService>();

        // Anthropic / Claude (Claude scan checks)
        services.Configure<AnthropicConfig>(configuration.GetSection(AnthropicConfig.SectionName));
        services.AddHttpClient("Anthropic");
        services.AddScoped<IClaudeService, ClaudeService>();

        // Google Gemini (Gemini scan checks)
        services.Configure<GeminiConfig>(configuration.GetSection(GeminiConfig.SectionName));
        services.AddHttpClient("Gemini");
        services.AddScoped<IGeminiService, GeminiService>();

        // OpenAI-compatible providers: Grok (xAI), Perplexity, Copilot (configurable endpoint)
        services.Configure<GrokConfig>(configuration.GetSection(GrokConfig.SectionName));
        services.AddHttpClient("Grok");
        services.AddScoped<IGrokService, GrokService>();
        services.Configure<PerplexityConfig>(configuration.GetSection(PerplexityConfig.SectionName));
        services.AddHttpClient("Perplexity");
        services.AddScoped<IPerplexityService, PerplexityService>();
        services.Configure<CopilotConfig>(configuration.GetSection(CopilotConfig.SectionName));
        services.AddHttpClient("Copilot");
        services.AddScoped<ICopilotService, CopilotService>();

        // OpenAI
        services.Configure<OpenAiConfig>(configuration.GetSection(OpenAiConfig.SectionName));
        services.AddHttpClient("OpenAI");
        services.AddScoped<IOpenAiService, OpenAiService>();

        // Competitors (now via OpenAI)
        services.AddScoped<ICompetitorSuggestionService, OpenAiCompetitorSuggestionService>();

        // Re-suggestion (enriched competitors + topics using confirmed data)
        services.AddScoped<IResuggestService, OpenAiResuggestService>();

        // Prompt generation (LLM-backed, with deterministic template-fill fallback)
        services.AddScoped<TemplatePromptGenerator>();
        services.AddScoped<IPromptGenerator, OpenAiPromptGenerator>();

        // Scan execution: Hangfire dispatches IScanExecutor jobs (Phase 3 Slice 0).
        // IBackgroundJobClient (from AddHangfire in Program.cs) injects the enqueuer;
        // Hangfire workers pull jobs, resolve IScanExecutor in a fresh DI scope, invoke.
        services.AddScoped<IScanExecutor, ScanExecutor>();
        services.AddScoped<IPlatformClient, OpenAiPlatformClient>();
        services.AddScoped<IPlatformClient, ClaudePlatformClient>();
        services.AddScoped<IPlatformClient, GeminiPlatformClient>();
        services.AddScoped<IPlatformClient, GrokPlatformClient>();
        services.AddScoped<IPlatformClient, PerplexityPlatformClient>();
        services.AddScoped<IPlatformClient, CopilotPlatformClient>();
        services.AddScoped<IScanProvider, ScanProviderRouter>();

        // Phase 3 analysis pipeline: two Hangfire-invoked jobs chained via ContinueJobWith.
        // ScanExecutor enqueues SignalExtractionJob on scan completion; that job's success
        // triggers MetricAggregationJob via continuation. Slice 1 ships skeleton implementations
        // (status transitions only); Slices 2 + 4 fill in the real work.
        services.AddScoped<ISignalExtractionJob, SignalExtractionJob>();
        services.AddScoped<IMetricAggregationJob, MetricAggregationJob>();

        // Crawling
        services.AddHttpClient("Crawler", client =>
        {
            client.DefaultRequestHeaders.Add("User-Agent", "LuminaBot/1.0 (discovery)");
            client.Timeout = TimeSpan.FromSeconds(10);
        });
        services.AddHttpClient("Anthropic");
        services.AddScoped<IWebsiteDiscoveryService, WebsiteDiscoveryService>();

        // Content Extraction (LLM-powered, with heuristic fallback)
        services.AddScoped<HeuristicContentExtractor>();
        services.AddScoped<IContentExtractor, LlmContentExtractor>();

        // SignalR Notifier
        services.AddScoped<IDiscoveryProgressNotifier, SignalRDiscoveryProgressNotifier>();

        // Transient draft store for unconfirmed discovery suggestions
        services.AddMemoryCache();
        services.AddSingleton<IDiscoveryDraftStore, MemoryDiscoveryDraftStore>();

        return services;
    }
}
