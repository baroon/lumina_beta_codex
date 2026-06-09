namespace AIVisibility.Domain.Entities;

public class TrackerAudience
{
    public Guid TrackerConfigurationId { get; set; }
    public Guid AudienceId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
