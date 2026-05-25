namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Microsoft Copilot via a configurable OpenAI-compatible endpoint. Returns an empty string when
/// no API key / base URL is configured.
/// </summary>
public interface ICopilotService
{
    Task<string> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 1024,
        double temperature = 0.7,
        CancellationToken cancellationToken = default);

    bool IsConfigured { get; }
}
