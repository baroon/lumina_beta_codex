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

    public Brand Brand { get; set; } = null!;
}
