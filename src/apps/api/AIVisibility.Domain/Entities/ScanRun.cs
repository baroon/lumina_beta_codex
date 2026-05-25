using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// One execution of a Visibility Tracker (ADR-002 §15). Fans out into PromptRuns =
/// Active prompts × selected platforms. A snapshot of counts is kept for reporting.
/// </summary>
public class ScanRun
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public ScanTriggerType TriggerType { get; set; }
    public ScanRunStatus Status { get; set; }
    public int PromptCount { get; set; }
    public int PlatformCount { get; set; }
    public int ScanCheckCount { get; set; }
    public int CompletedCount { get; set; }
    public int FailedCount { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
    public ICollection<PromptRun> PromptRuns { get; set; } = new List<PromptRun>();
}
