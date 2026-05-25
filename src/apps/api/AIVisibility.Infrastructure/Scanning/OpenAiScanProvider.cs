using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>
/// Routes scan checks to OpenAI for ChatGPT / ChatGPT Search. Other platforms (Gemini, Claude)
/// have no adapter in v1 and return a "not configured" result so the run completes cleanly.
/// </summary>
public class OpenAiScanProvider : IScanProvider
{
    private readonly IOpenAiService _openAi;

    private static readonly HashSet<string> OpenAiPlatforms =
        new(StringComparer.OrdinalIgnoreCase) { "ChatGpt", "ChatGptSearch" };

    private const string SystemPrompt =
        "You are an AI assistant answering a user's question as you normally would. Be concise and specific.";

    public OpenAiScanProvider(IOpenAiService openAi)
    {
        _openAi = openAi;
    }

    public async Task<ScanAnswer> GetAnswerAsync(
        string platformCode,
        string prompt,
        CancellationToken cancellationToken = default)
    {
        if (!OpenAiPlatforms.Contains(platformCode))
            return new ScanAnswer(false, string.Empty, $"No provider configured for platform '{platformCode}'.");

        var response = await _openAi.ChatCompletionAsync(SystemPrompt, prompt, 1024, 0.7, cancellationToken);
        if (string.IsNullOrWhiteSpace(response))
            return new ScanAnswer(false, string.Empty, "No response from provider (check the API key).");

        return new ScanAnswer(true, response.Trim(), null, response);
    }
}
