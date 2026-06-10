namespace AIVisibility.Domain.Entities;

/// <summary>
/// Reusable prompt template tied to a Visibility Lens (ADR-002 §5). Seeded as
/// starter library, but the table grows over time as new lenses ship and
/// existing phrasings are refined. <see cref="CreatedAt"/> tags each row with
/// the batch it shipped in; <see cref="IsActive"/> lets a weak template be
/// retired without losing the historical <c>prompts.prompt_template_id</c>
/// lineage. <see cref="TemplateText"/> contains placeholders
/// (<c>{category}</c>, <c>{market}</c>, <c>{topic}</c>, <c>{competitor}</c>,
/// <c>{brand}</c>) filled during prompt generation from confirmed Discovery
/// + tracker coverage.
/// </summary>
public class PromptTemplate
{
    public Guid Id { get; set; }
    public Guid LensId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string TemplateText { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
