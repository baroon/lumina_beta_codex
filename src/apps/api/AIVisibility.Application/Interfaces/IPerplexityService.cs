namespace AIVisibility.Application.Interfaces;

/// <summary>Perplexity chat completion. Returns an empty string when no API key is configured.</summary>
public interface IPerplexityService
{
    Task<string> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default);
}
