using AIVisibility.Application.Interfaces;

namespace AIVisibility.Tests.TestHelpers;

/// <summary>
/// Builds a minimal <see cref="ProviderCompletionEnvelope"/> for tests so
/// existing <c>.ReturnsAsync(string)</c> mock setups translate to the new
/// envelope-typed interfaces without bloating every test file with the
/// full record initialiser. Uses fixed timestamps and a stub model/provider
/// so tests stay deterministic.
/// </summary>
internal static class TestEnvelope
{
    public static ProviderCompletionEnvelope Of(string text, string provider = "Test") =>
        new(
            Provider: provider,
            Model: "test-model",
            StartedAt: DateTime.UnixEpoch,
            CompletedAt: DateTime.UnixEpoch,
            LatencyMs: 0,
            Text: text,
            FinishReason: "stop",
            PromptTokens: null,
            CompletionTokens: null,
            TotalTokens: null,
            Error: null);
}
