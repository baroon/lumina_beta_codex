using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.Common;

/// <summary>
/// Workspace-wide filter-dimension name→id resolvers shared by every
/// "workspace report" query (Overview, Competitive, Depth, Sources,
/// Prompts). Originally lived as private methods on
/// GetWorkspaceOverviewQueryHandler; lifted out so handlers in other
/// namespaces can reuse the exact resolution semantics without
/// duplicating the EF queries (or, worse, drifting from them).
///
/// Each resolver returns <c>null</c> when the input is null/empty
/// (meaning "no filter") and a possibly-empty <c>HashSet</c> when the
/// input is non-empty (meaning "narrow to these — even if zero match").
/// Returning the empty set rather than null on a typo'd code is
/// deliberate: callers naturally collapse to zero rows downstream,
/// which is the honest answer for an invalid filter value.
/// </summary>
public static class FilterResolvers
{
    public static async Task<HashSet<Guid>?> ResolveLensIdSetAsync(
        IAppDbContext db, IReadOnlyList<string>? codes, CancellationToken ct)
    {
        if (codes is null || codes.Count == 0) return null;
        var ids = await db.Lenses.AsNoTracking()
            .Where(l => codes.Contains(l.Code))
            .Select(l => l.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    public static async Task<HashSet<Guid>?> ResolveTopicIdSetAsync(
        IAppDbContext db, Guid workspaceId, IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names is null || names.Count == 0) return null;
        var ids = await db.Topics.AsNoTracking()
            .Where(t => names.Contains(t.Name)
                && db.Brands.Any(b => b.Id == t.BrandId && b.WorkspaceId == workspaceId))
            .Select(t => t.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    public static async Task<HashSet<Guid>?> ResolveProductIdSetAsync(
        IAppDbContext db, Guid workspaceId, IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names is null || names.Count == 0) return null;
        var ids = await db.Products.AsNoTracking()
            .Where(p => names.Contains(p.Name)
                && db.Brands.Any(b => b.Id == p.BrandId && b.WorkspaceId == workspaceId))
            .Select(p => p.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    public static async Task<HashSet<Guid>?> ResolveMarketIdSetAsync(
        IAppDbContext db, Guid workspaceId, IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names is null || names.Count == 0) return null;
        var ids = await db.Markets.AsNoTracking()
            .Where(m => names.Contains(m.Name)
                && db.Brands.Any(b => b.Id == m.BrandId && b.WorkspaceId == workspaceId))
            .Select(m => m.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    public static async Task<HashSet<Guid>?> ResolveAudienceIdSetAsync(
        IAppDbContext db, Guid workspaceId, IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names is null || names.Count == 0) return null;
        var ids = await db.Audiences.AsNoTracking()
            .Where(a => names.Contains(a.Name)
                && db.Brands.Any(b => b.Id == a.BrandId && b.WorkspaceId == workspaceId))
            .Select(a => a.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    /// <summary>
    /// Resolve Sentiment enum names ("Positive" / "Neutral" / etc.) to
    /// a HashSet of the enum values. Null/empty input ⇒ null out
    /// ("no sentiment filter"). Unknown strings drop silently — the FE
    /// shouldn't be able to send them, but a stale URL or typo
    /// shouldn't 500 the API. Pure (no DB hit).
    /// </summary>
    public static HashSet<Sentiment>? ResolveSentimentSet(IReadOnlyList<string>? values)
    {
        if (values is null || values.Count == 0) return null;
        var set = new HashSet<Sentiment>();
        foreach (var v in values)
        {
            if (Enum.TryParse<Sentiment>(v, ignoreCase: false, out var parsed))
            {
                set.Add(parsed);
            }
        }
        return set;
    }

    public static async Task<HashSet<Guid>?> ResolvePlatformIdSetAsync(
        IAppDbContext db, IReadOnlyList<string>? codes, CancellationToken ct)
    {
        if (codes is null || codes.Count == 0) return null;
        var ids = await db.AIPlatforms.AsNoTracking()
            .Where(p => codes.Contains(p.Code))
            .Select(p => p.Id)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }
}
