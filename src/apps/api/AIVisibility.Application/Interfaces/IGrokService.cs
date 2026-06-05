namespace AIVisibility.Application.Interfaces;

/// <summary>xAI Grok chat completion. Returns an empty string when no API key is configured.</summary>
public interface IGrokService
{
    Task<ProviderCompletionEnvelope> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default);

    bool IsConfigured { get; }
}
