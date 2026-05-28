namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Resolves the optional <c>(from, to)</c> request pair into the effective
/// window the overview handlers query against. <c>From=null</c> stays null
/// (callers translate that to "skip the lower-bound predicate" = all time);
/// <c>To=null</c> resolves to <see cref="DateTime.UtcNow"/> so handlers always
/// have a concrete upper bound to filter and echo back to clients.
/// </summary>
internal static class WindowResolver
{
    public static (DateTime? From, DateTime To) Resolve(DateTime? from, DateTime? to)
        => (from, to ?? DateTime.UtcNow);
}
