namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Full provider response envelope returned by every LLM service call.
/// Flows through every chat-completion boundary so timing, token usage,
/// and finish reason are first-class observability data (persisted into
/// <c>ai_answers.raw_response</c>).
///
/// <see cref="Text"/> is the body callers read. The rest of the fields are
/// best-effort: providers vary on what they expose, so populate what's
/// available and leave the rest null rather than guessing.
///
/// On failure (HTTP non-2xx, transport exception, empty response), the
/// service still returns an envelope with <see cref="Text"/> empty and
/// <see cref="Error"/> populated — callers treat
/// <c>string.IsNullOrEmpty(Text)</c> as "no answer."
/// </summary>
public sealed record ProviderCompletionEnvelope(
    string Provider,
    string Model,
    DateTime StartedAt,
    DateTime CompletedAt,
    int LatencyMs,
    string Text,
    string? FinishReason,
    int? PromptTokens,
    int? CompletionTokens,
    int? TotalTokens,
    string? Error)
{
    /// <summary>
    /// Convenience for the failure path — every service builds a "we did not
    /// get an answer" envelope the same way (timing + error message, empty
    /// text, null usage fields). Centralises that shape so impls do not
    /// drift on what counts as the failure envelope.
    /// </summary>
    public static ProviderCompletionEnvelope Failure(
        string provider, string model, DateTime startedAt, DateTime completedAt, string error) =>
        new(provider, model, startedAt, completedAt,
            LatencyMs: (int)(completedAt - startedAt).TotalMilliseconds,
            Text: string.Empty,
            FinishReason: null,
            PromptTokens: null, CompletionTokens: null, TotalTokens: null,
            Error: error);
}
