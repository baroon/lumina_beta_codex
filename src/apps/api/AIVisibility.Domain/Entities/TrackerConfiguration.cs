using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// Internal durable setup for a user-facing Visibility Tracker (ADR-002).
/// Platforms/models and prompt allocation are fixed after creation; cadence and the
/// prompt set may change later within the fixed allocation.
/// </summary>
public class TrackerConfiguration
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsNameUserEdited { get; set; }
    public int PromptAllocation { get; set; }
    public Cadence Cadence { get; set; }
    public string? Timezone { get; set; }
    public TrackerStatus Status { get; set; }
    public DateTime? NextRunAt { get; set; }
    public DateTime? LastRunAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Brand Brand { get; set; } = null!;

    // Backend coverage (ADR-002 §4) — created from confirmed Discovery outputs.
    public ICollection<TrackerTopic> Topics { get; set; } = new List<TrackerTopic>();
    public ICollection<TrackerVisibilityCheck> VisibilityChecks { get; set; } = new List<TrackerVisibilityCheck>();
    public ICollection<TrackerCompetitor> Competitors { get; set; } = new List<TrackerCompetitor>();
    public ICollection<TrackerProduct> Products { get; set; } = new List<TrackerProduct>();
    public ICollection<TrackerAudience> Audiences { get; set; } = new List<TrackerAudience>();
    public ICollection<TrackerMarket> Markets { get; set; } = new List<TrackerMarket>();
}
