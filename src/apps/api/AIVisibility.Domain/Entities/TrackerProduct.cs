namespace AIVisibility.Domain.Entities;

public class TrackerProduct
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public Guid ProductId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
