namespace AIVisibility.Application.Commands.Trackers;

/// <summary>
/// Thrown by <see cref="CreateTrackerCommandHandler"/> when a user-supplied
/// tracker name collides with an existing tracker on the same brand. The
/// auto-namer path silently disambiguates with a numeric suffix; this
/// exception only fires when the user typed an explicit name. The API layer
/// maps this to HTTP 409 with a user-readable message.
/// </summary>
public class DuplicateTrackerNameException : Exception
{
    public DuplicateTrackerNameException(string trackerName)
        : base($"A tracker named \"{trackerName}\" already exists for this brand.")
    {
        TrackerName = trackerName;
    }

    public string TrackerName { get; }
}
