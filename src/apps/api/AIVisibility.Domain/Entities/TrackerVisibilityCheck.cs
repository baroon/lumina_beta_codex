namespace AIVisibility.Domain.Entities;

public class TrackerVisibilityCheck
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public Guid VisibilityCheckId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
