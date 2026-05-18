using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

public class TrustSignal
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public TrustSignalType SignalType { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? SourcePagesJson { get; set; }
    public double Confidence { get; set; }
    public CandidateSource Source { get; set; }
    public CandidateStatus Status { get; set; }

    public Brand Brand { get; set; } = null!;
}
