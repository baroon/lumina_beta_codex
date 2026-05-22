namespace AIVisibility.Domain.Entities;

public class TrackerTopic
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public Guid TopicId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
