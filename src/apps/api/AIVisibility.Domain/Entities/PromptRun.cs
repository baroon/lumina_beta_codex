using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>A single scan check: one prompt run against one AI platform (ADR-002 §15).</summary>
public class PromptRun
{
    public Guid Id { get; set; }
    public Guid ScanRunId { get; set; }
    public Guid PromptId { get; set; }
    public Guid AIPlatformId { get; set; }
    public PromptRunStatus Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }

    public ScanRun ScanRun { get; set; } = null!;
    public AIAnswer? Answer { get; set; }
}
