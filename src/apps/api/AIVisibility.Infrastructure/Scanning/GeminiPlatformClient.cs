using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>Serves Gemini via Google.</summary>
public class GeminiPlatformClient : IPlatformClient
{
    private readonly IGeminiService _gemini;

    public GeminiPlatformClient(IGeminiService gemini)
    {
        _gemini = gemini;
    }

    public bool Handles(string platformCode) =>
        string.Equals(platformCode, "Gemini", StringComparison.OrdinalIgnoreCase);

    public async Task<ScanAnswer> GetAnswerAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var response = await _gemini.ChatCompletionAsync(ScanSystemPrompt.Value, prompt, 1024, 0.7, cancellationToken);
        return string.IsNullOrWhiteSpace(response)
            ? new ScanAnswer(false, string.Empty, "No response from Gemini (check the API key).")
            : new ScanAnswer(true, response.Trim(), null, response);
    }
}
