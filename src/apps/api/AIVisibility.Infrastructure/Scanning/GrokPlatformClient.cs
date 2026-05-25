using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>Serves Grok via xAI.</summary>
public class GrokPlatformClient : IPlatformClient
{
    private readonly IGrokService _grok;

    public GrokPlatformClient(IGrokService grok)
    {
        _grok = grok;
    }

    public bool IsConfigured => _grok.IsConfigured;

    public bool Handles(string platformCode) =>
        string.Equals(platformCode, "Grok", StringComparison.OrdinalIgnoreCase);

    public async Task<ScanAnswer> GetAnswerAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var response = await _grok.ChatCompletionAsync(ScanSystemPrompt.Value, prompt, 1024, 0.7, cancellationToken);
        return string.IsNullOrWhiteSpace(response)
            ? new ScanAnswer(false, string.Empty, "No response from Grok (check the API key).")
            : new ScanAnswer(true, response.Trim(), null, response);
    }
}
