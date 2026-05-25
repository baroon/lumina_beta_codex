namespace AIVisibility.Application.Interfaces;

/// <summary>Runs a single prompt against one AI platform and returns its answer.</summary>
public interface IScanProvider
{
    Task<ScanAnswer> GetAnswerAsync(
        string platformCode,
        string prompt,
        CancellationToken cancellationToken = default);

    /// <summary>Whether a client with an API key is configured for this platform.</summary>
    bool IsConfigured(string platformCode);
}

public record ScanAnswer(bool Success, string Text, string? Error, string? RawResponse = null);
