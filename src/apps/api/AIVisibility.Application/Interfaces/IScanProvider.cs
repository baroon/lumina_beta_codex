namespace AIVisibility.Application.Interfaces;

/// <summary>Runs a single prompt against one AI platform and returns its answer.</summary>
public interface IScanProvider
{
    Task<ScanAnswer> GetAnswerAsync(
        string platformCode,
        string prompt,
        CancellationToken cancellationToken = default);
}

public record ScanAnswer(bool Success, string Text, string? Error, string? RawResponse = null);
