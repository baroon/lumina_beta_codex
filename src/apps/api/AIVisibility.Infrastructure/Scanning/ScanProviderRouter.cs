using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>
/// Routes a scan check to the platform client that handles its platform code. Platforms with no
/// configured client (e.g. Grok, Perplexity, Copilot in v1) return a "not configured" result so
/// the run completes cleanly.
/// </summary>
public class ScanProviderRouter : IScanProvider
{
    private readonly IReadOnlyList<IPlatformClient> _clients;

    public ScanProviderRouter(IEnumerable<IPlatformClient> clients)
    {
        _clients = clients.ToList();
    }

    public Task<ScanAnswer> GetAnswerAsync(
        string platformCode,
        string prompt,
        CancellationToken cancellationToken = default)
    {
        var client = _clients.FirstOrDefault(c => c.Handles(platformCode));
        return client is null
            ? Task.FromResult(new ScanAnswer(
                false,
                string.Empty,
                $"No provider configured for platform '{platformCode}'."))
            : client.GetAnswerAsync(prompt, cancellationToken);
    }

    public bool IsConfigured(string platformCode) =>
        _clients.FirstOrDefault(c => c.Handles(platformCode))?.IsConfigured ?? false;
}
