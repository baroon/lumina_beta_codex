namespace AIVisibility.Application.Interfaces;

public interface IOpenAiService
{
    Task<ProviderCompletionEnvelope> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 2048,
        double temperature = 0.3,
        CancellationToken ct = default);

    bool IsConfigured { get; }
}
