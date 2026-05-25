using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>Serves ChatGPT and ChatGPT Search via OpenAI.</summary>
public class OpenAiPlatformClient : IPlatformClient
{
    private static readonly HashSet<string> Codes =
        new(StringComparer.OrdinalIgnoreCase) { "ChatGpt", "ChatGptSearch" };

    private readonly IOpenAiService _openAi;

    public OpenAiPlatformClient(IOpenAiService openAi)
    {
        _openAi = openAi;
    }

    public bool IsConfigured => _openAi.IsConfigured;

    public bool Handles(string platformCode) => Codes.Contains(platformCode);

    public async Task<ScanAnswer> GetAnswerAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var response = await _openAi.ChatCompletionAsync(ScanSystemPrompt.Value, prompt, 1024, 0.7, cancellationToken);
        return string.IsNullOrWhiteSpace(response)
            ? new ScanAnswer(false, string.Empty, "No response from OpenAI (check the API key).")
            : new ScanAnswer(true, response.Trim(), null, response);
    }
}
