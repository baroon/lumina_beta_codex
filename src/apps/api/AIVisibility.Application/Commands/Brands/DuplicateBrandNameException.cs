namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Thrown by <see cref="RenameBrandCommandHandler"/> when the supplied
/// name collides with another brand in the same workspace. The DB has a
/// case-insensitive unique index on <c>(workspace_id, lower(name))</c>;
/// this exception surfaces that constraint to the API layer, which
/// maps it to HTTP 409 with a user-readable message — mirrors the
/// <see cref="Trackers.DuplicateTrackerNameException"/> shape.
/// </summary>
public class DuplicateBrandNameException : Exception
{
    public DuplicateBrandNameException(string brandName)
        : base($"A brand named \"{brandName}\" already exists in this workspace.")
    {
        BrandName = brandName;
    }

    public string BrandName { get; }
}
