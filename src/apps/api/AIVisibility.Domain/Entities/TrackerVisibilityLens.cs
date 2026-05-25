namespace AIVisibility.Domain.Entities;

public class TrackerVisibilityLens
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public Guid VisibilityLensId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
