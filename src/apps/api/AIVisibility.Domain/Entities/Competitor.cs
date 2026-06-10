using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

public class Competitor
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>
    /// Alternate competitor names ("also known as") used as a proxy for
    /// mention detection in scan answers. Same shape as
    /// <see cref="Brand.Aliases"/>: jsonb array, empty by default. Lets
    /// "Outlook India" / "Outlook" / "Outlook magazine" all resolve to the
    /// same Competitor row.
    /// </summary>
    public List<string> Aliases { get; set; } = new();
    public string? Domain { get; set; }
    public string? Description { get; set; }
    public double Confidence { get; set; }
    public CandidateSource Source { get; set; }
    public Guid DiscoveryRunId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Brand Brand { get; set; } = null!;
    public DiscoveryRun DiscoveryRun { get; set; } = null!;
}
