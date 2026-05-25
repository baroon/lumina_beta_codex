using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Crawling;
using AIVisibility.Infrastructure.Data;
using AIVisibility.Infrastructure.Discovery;
using AIVisibility.Infrastructure.Prompts;
using AIVisibility.Infrastructure.Scanning;
using AIVisibility.Infrastructure.Providers.Anthropic;
using AIVisibility.Infrastructure.Providers.Gemini;
using AIVisibility.Infrastructure.Providers.OpenAi;
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

        // Scan execution (Phase 2): in-process queue + background runner + per-platform clients
        services.AddSingleton<IScanQueue, ScanQueue>();
        services.AddScoped<IScanExecutor, ScanExecutor>();
        services.AddScoped<IPlatformClient, OpenAiPlatformClient>();
        services.AddScoped<IPlatformClient, ClaudePlatformClient>();
        services.AddScoped<IPlatformClient, GeminiPlatformClient>();
        services.AddScoped<IScanProvider, ScanProviderRouter>();
        services.AddHostedService<ScanRunner>();

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
