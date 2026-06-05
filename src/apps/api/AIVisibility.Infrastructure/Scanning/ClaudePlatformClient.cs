using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>Serves Claude via Anthropic.</summary>
public class ClaudePlatformClient : IPlatformClient
{
    private readonly IClaudeService _claude;

    public ClaudePlatformClient(IClaudeService claude)
    {
        _claude = claude;
    }

    public bool IsConfigured => _claude.IsConfigured;

    public bool Handles(string platformCode) =>
        string.Equals(platformCode, "Claude", StringComparison.OrdinalIgnoreCase);

    public async Task<ScanAnswer> GetAnswerAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var env = await _claude.ChatCompletionAsync(ScanSystemPrompt.Value, prompt, 1024, 0.7, cancellationToken);
        return PlatformClientEnvelope.BuildScanAnswer(env, "Claude");
    }
}
