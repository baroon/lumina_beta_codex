namespace AIVisibility.Application.Trackers;

/// <summary>
/// Generates the suggested Visibility Tracker name (ADR-002 §2):
/// "{Market} {Category/Product} Visibility Tracker", falling back to "Global" when no
/// market is known and dropping the descriptor when no category/product is available.
/// </summary>
public static class TrackerNaming
{
    public static string Generate(string? marketName, string? category, string? productName)
    {
        var market = string.IsNullOrWhiteSpace(marketName) ? "Global" : marketName.Trim();
        var descriptor = !string.IsNullOrWhiteSpace(category)
            ? category.Trim()
            : string.IsNullOrWhiteSpace(productName)
                ? null
                : productName.Trim();

        return descriptor is null
            ? $"{market} Visibility Tracker"
            : $"{market} {descriptor} Visibility Tracker";
    }

    /// <summary>
    /// Disambiguates a generated name against the set of existing tracker
    /// names on the same brand (case-insensitive, matching the
    /// <c>UNIQUE (brand_id, LOWER(name))</c> DB constraint). Returns the base
    /// name if it doesn't collide, otherwise appends "(2)", "(3)", … until a
    /// free slot is found. Used by both the wizard preview and the create
    /// handler so the suggested name and the persisted name stay in sync.
    /// </summary>
    public static string GenerateUnique(
        string? marketName,
        string? category,
        string? productName,
        IEnumerable<string> existingNames)
    {
        var baseName = Generate(marketName, category, productName);
        var taken = new HashSet<string>(existingNames, StringComparer.OrdinalIgnoreCase);

        if (!taken.Contains(baseName)) return baseName;

        for (var n = 2; ; n++)
        {
            var candidate = $"{baseName} ({n})";
            if (!taken.Contains(candidate)) return candidate;
        }
    }
}
