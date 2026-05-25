using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>Serves Perplexity.</summary>
public class PerplexityPlatformClient : IPlatformClient
{
    private readonly IPerplexityService _perplexity;

    public PerplexityPlatformClient(IPerplexityService perplexity)
    {
        _perplexity = perplexity;
    }

    public bool Handles(string platformCode) =>
        string.Equals(platformCode, "Perplexity", StringComparison.OrdinalIgnoreCase);

    public async Task<ScanAnswer> GetAnswerAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var response =
            await _perplexity.ChatCompletionAsync(ScanSystemPrompt.Value, prompt, 1024, 0.7, cancellationToken);
        return string.IsNullOrWhiteSpace(response)
            ? new ScanAnswer(false, string.Empty, "No response from Perplexity (check the API key).")
            : new ScanAnswer(true, response.Trim(), null, response);
    }
}
