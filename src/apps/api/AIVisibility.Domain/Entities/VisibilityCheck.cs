namespace AIVisibility.Domain.Entities;

/// <summary>
/// Predefined type of AI visibility test (ADR-001). Static reference/seed data, not
/// extracted from crawl. Used as a tracker coverage dimension and to drive prompt generation.
/// </summary>
public class VisibilityCheck
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
}
