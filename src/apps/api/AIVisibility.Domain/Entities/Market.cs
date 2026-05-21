using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

public class Market
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CountryCode { get; set; }
    public string? Region { get; set; }
    public string? City { get; set; }
    public string? LanguageCode { get; set; }
    public string? CurrencyCode { get; set; }
    public bool IsCustom { get; set; }
    public double Confidence { get; set; }
    public CandidateSource Source { get; set; }
    public CandidateStatus Status { get; set; }
    public Guid DiscoveryRunId { get; set; }

    public Brand Brand { get; set; } = null!;
    public DiscoveryRun DiscoveryRun { get; set; } = null!;
}
