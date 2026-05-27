namespace AIVisibility.Domain.Entities;

/// <summary>
/// A specific URL associated with a <see cref="Source"/> (ADR-003
/// §SourceUrl). Multiple URLs per source (e.g. Trustpilot has one URL per
/// reviewed company). Deduped by <see cref="NormalizedUrl"/>.
/// </summary>
public class SourceUrl
{
    public Guid Id { get; set; }
    public Guid SourceId { get; set; }

    public string Url { get; set; } = string.Empty;
    public string NormalizedUrl { get; set; } = string.Empty;

    public string? Title { get; set; }

    public DateTime CreatedAt { get; set; }

    public Source Source { get; set; } = null!;
}
