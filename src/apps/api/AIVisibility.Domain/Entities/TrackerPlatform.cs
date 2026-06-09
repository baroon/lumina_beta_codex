namespace AIVisibility.Domain.Entities;

/// <summary>Maps a Visibility Tracker to a selected AI platform. Fixed after the tracker is activated.</summary>
public class TrackerPlatform
{
    public Guid TrackerConfigurationId { get; set; }
    public Guid AIPlatformId { get; set; }

    public TrackerConfiguration TrackerConfiguration { get; set; } = null!;
}
