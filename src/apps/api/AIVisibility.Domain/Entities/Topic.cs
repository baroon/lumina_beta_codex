using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

public class Topic
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public CandidateSource Source { get; set; }
    public Guid DiscoveryRunId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Brand Brand { get; set; } = null!;
    public DiscoveryRun DiscoveryRun { get; set; } = null!;
}
