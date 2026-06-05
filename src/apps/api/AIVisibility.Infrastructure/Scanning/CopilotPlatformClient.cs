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

    public bool IsConfigured => _copilot.IsConfigured;

    public bool Handles(string platformCode) =>
        string.Equals(platformCode, "Copilot", StringComparison.OrdinalIgnoreCase);

    public async Task<ScanAnswer> GetAnswerAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var env = await _copilot.ChatCompletionAsync(ScanSystemPrompt.Value, prompt, 1024, 0.7, cancellationToken);
        return PlatformClientEnvelope.BuildScanAnswer(env, "Copilot");
    }
}
