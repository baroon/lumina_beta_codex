namespace AIVisibility.Application.Interfaces;

/// <summary>An AI-platform adapter that answers a prompt. One implementation per provider family.</summary>
public interface IPlatformClient
{
    /// <summary>Whether this client serves the given AIPlatform code (e.g. "Gemini").</summary>
    bool Handles(string platformCode);

    Task<ScanAnswer> GetAnswerAsync(string prompt, CancellationToken cancellationToken = default);

    /// <summary>Whether this client has an API key (and endpoint) configured.</summary>
    bool IsConfigured { get; }
}
