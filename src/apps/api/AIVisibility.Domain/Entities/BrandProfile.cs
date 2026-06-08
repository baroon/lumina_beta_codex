using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

public class BrandProfile
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public string? ShortDescription { get; set; }
    public string? Industry { get; set; }
    public string? Category { get; set; }
    public string? Positioning { get; set; }
    public double Confidence { get; set; }
    public CandidateSource Source { get; set; }
    public Guid DiscoveryRunId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Brand Brand { get; set; } = null!;
    public DiscoveryRun DiscoveryRun { get; set; } = null!;
}
