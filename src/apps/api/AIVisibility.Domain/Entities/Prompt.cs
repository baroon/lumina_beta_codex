using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

/// <summary>
/// A natural-language prompt belonging to a Visibility Tracker (ADR-002 §9). Generated from a
/// template or user-added; starts Draft and becomes Active on confirmation. Prompt-to-dimension
/// mappings are hidden system metadata used for regeneration, analytics, and report grouping.
/// </summary>
public class Prompt
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public string PromptText { get; set; } = string.Empty;
    public Guid VisibilityLensId { get; set; }
    public Guid? PromptTemplateId { get; set; }
    public PromptStatus Status { get; set; }
    public PromptSource Source { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
    public ICollection<PromptTopic> Topics { get; set; } = new List<PromptTopic>();
    public ICollection<PromptCompetitor> Competitors { get; set; } = new List<PromptCompetitor>();
    public ICollection<PromptProduct> Products { get; set; } = new List<PromptProduct>();
    public ICollection<PromptAudience> Audiences { get; set; } = new List<PromptAudience>();
    public ICollection<PromptMarket> Markets { get; set; } = new List<PromptMarket>();
}
