namespace AIVisibility.Domain.Entities;

public class TrackerMarket
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public Guid MarketId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
