namespace AIVisibility.Domain.Entities;

public class TrackerLens
{
    public Guid TrackerConfigurationId { get; set; }
    public Guid LensId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
