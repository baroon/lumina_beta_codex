namespace AIVisibility.Application.Interfaces;

/// <summary>Google Gemini text generation. Returns an empty string when no API key is configured.</summary>
public interface IGeminiService
{
    Task<string> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default);

    bool IsConfigured { get; }
}
