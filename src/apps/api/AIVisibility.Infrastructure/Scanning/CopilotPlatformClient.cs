using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>Serves Copilot via a configured OpenAI-compatible endpoint.</summary>
public class CopilotPlatformClient : IPlatformClient
{
    private readonly ICopilotService _copilot;

    public CopilotPlatformClient(ICopilotService copilot)
    {
        _copilot = copilot;
    }

    public bool Handles(string platformCode) =>
        string.Equals(platformCode, "Copilot", StringComparison.OrdinalIgnoreCase);

    public async Task<ScanAnswer> GetAnswerAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var response = await _copilot.ChatCompletionAsync(ScanSystemPrompt.Value, prompt, 1024, 0.7, cancellationToken);
        return string.IsNullOrWhiteSpace(response)
            ? new ScanAnswer(false, string.Empty, "No response from Copilot (check the API key / endpoint).")
            : new ScanAnswer(true, response.Trim(), null, response);
    }
}
