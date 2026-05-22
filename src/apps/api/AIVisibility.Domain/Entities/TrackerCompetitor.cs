namespace AIVisibility.Domain.Entities;

public class TrackerCompetitor
{
    public Guid Id { get; set; }
    public Guid TrackerConfigurationId { get; set; }
    public Guid CompetitorId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
