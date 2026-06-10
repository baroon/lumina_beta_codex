using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

public class Product
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>
    /// Alternate product names ("also known as") used as a proxy for mention
    /// detection in scan answers. Same shape as <see cref="Brand.Aliases"/>
    /// and <see cref="Competitor.Aliases"/>: jsonb array, empty by default.
    /// Lets "Adobe Photoshop" / "Photoshop" / "PS" all resolve to the same row.
    /// </summary>
    public List<string> Aliases { get; set; } = new();
    public string? Description { get; set; }
    public ProductType ProductType { get; set; }
    public double Confidence { get; set; }
    public CandidateSource Source { get; set; }
    public Guid DiscoveryRunId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Brand Brand { get; set; } = null!;
    public DiscoveryRun DiscoveryRun { get; set; } = null!;
}
