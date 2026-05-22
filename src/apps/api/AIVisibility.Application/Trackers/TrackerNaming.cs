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
}
