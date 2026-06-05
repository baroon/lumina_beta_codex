using System.Text.Json;
using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>
/// Shared helper: build a <see cref="ScanAnswer"/> from a
/// <see cref="ProviderCompletionEnvelope"/>. Every <c>*PlatformClient</c>
/// runs this — keeping the envelope-to-ScanAnswer shape centralised so
/// the 6 platforms cannot drift on how empty text / error / RawResponse
/// are populated.
///
/// RawResponse always carries the JSON-serialized envelope (success OR
/// failure) so the persisted row is observable end-to-end:
/// <c>raw_response::jsonb -&gt; 'totalTokens'</c> works regardless of
/// outcome.
/// </summary>
internal static class PlatformClientEnvelope
{
    private static readonly JsonSerializerOptions Options = new()
    {
        // camelCase makes downstream <c>jsonb -&gt; 'totalTokens'</c> queries
        // read naturally; the record property names are PascalCase in C#.
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    public static ScanAnswer BuildScanAnswer(ProviderCompletionEnvelope env, string providerLabel)
    {
        var rawJson = JsonSerializer.Serialize(env, Options);
        if (!string.IsNullOrEmpty(env.Error) || string.IsNullOrWhiteSpace(env.Text))
        {
            var err = env.Error ?? $"No response from {providerLabel} (check the API key).";
            return new ScanAnswer(false, string.Empty, err, rawJson);
        }
        return new ScanAnswer(true, env.Text.Trim(), null, rawJson);
    }
}
