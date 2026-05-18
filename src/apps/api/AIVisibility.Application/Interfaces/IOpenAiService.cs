namespace AIVisibility.Application.Interfaces;

public interface IOpenAiService
{
    Task<string> ChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        int maxTokens = 2048,
        double temperature = 0.3,
        CancellationToken ct = default);
}
