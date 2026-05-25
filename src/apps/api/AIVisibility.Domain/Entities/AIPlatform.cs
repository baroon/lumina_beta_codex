namespace AIVisibility.Domain.Entities;

/// <summary>
/// An AI platform/model the tracker can scan (ADR-002 §11). Static reference data; v1 supports
/// ChatGPT, ChatGPT Search, Gemini, and Claude. No per-brand platform configuration.
/// </summary>
public class AIPlatform
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsDefaultSelected { get; set; }
}
