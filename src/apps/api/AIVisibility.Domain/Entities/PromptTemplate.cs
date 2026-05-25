namespace AIVisibility.Domain.Entities;

/// <summary>
/// Reusable prompt template tied to a Visibility Check (ADR-002 §5). Static seed data.
/// TemplateText contains placeholders ({category}, {market}, {topic}, {competitor}, {brand})
/// filled during prompt generation from confirmed Discovery + tracker coverage.
/// </summary>
public class PromptTemplate
{
    public Guid Id { get; set; }
    public Guid VisibilityCheckId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string TemplateText { get; set; } = string.Empty;
}
