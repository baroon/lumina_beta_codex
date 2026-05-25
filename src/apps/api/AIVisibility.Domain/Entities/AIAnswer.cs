namespace AIVisibility.Domain.Entities;

/// <summary>
/// The AI platform's answer to a scan check, plus the raw provider response (ADR-002 §15).
/// Phase 3 analysis consumes these.
/// </summary>
public class AIAnswer
{
    public Guid Id { get; set; }
    public Guid PromptRunId { get; set; }
    public string AnswerText { get; set; } = string.Empty;
    public string? RawResponse { get; set; }
    public DateTime CreatedAt { get; set; }

    public PromptRun PromptRun { get; set; } = null!;
}
