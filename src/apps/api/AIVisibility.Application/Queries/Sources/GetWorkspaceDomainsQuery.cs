using MediatR;

namespace AIVisibility.Application.Queries.Sources;

/// <summary>
/// Workspace-scoped domain-level citation source view for the /sources/domains
/// page. Aggregates citations across every tracker in the workspace
/// (subject to the optional TrackerIds filter), groups by `Source.Id`,
/// returns one row per cited Source with retrieved-in-scans + last-seen +
/// citation count + the source's most-common SourceType across the
/// workspace's brand classifications.
///
/// Source classification is brand-contextual; a domain can be Owned for
/// one brand and Competitor for another. The workspace view picks the
/// dominant classification (highest count, ties broken by first-encountered
/// order) so the user gets a single label per row.
/// </summary>
public record GetWorkspaceDomainsQuery(
    DateTime? From,
    DateTime? To,
    IReadOnlyList<Guid>? TrackerIds = null) : IRequest<WorkspaceDomainsDto>;

public sealed record WorkspaceDomainsDto(
    Guid WorkspaceId,
    /// <summary>Window lower bound. Null = "all time".</summary>
    DateTime? From,
    DateTime To,
    IReadOnlyList<WorkspaceDomainRowDto> Domains);

public sealed record WorkspaceDomainRowDto(
    Guid SourceId,
    string SourceName,
    /// <summary>Canonical domain (lowercase, "www." stripped). Null for mentioned-source citations without URL.</summary>
    string? NormalizedDomain,
    /// <summary>Dominant SourceType code across the workspace's brand classifications. "Unknown" when no classification exists.</summary>
    string SourceType,
    /// <summary>Curated authority score, 0-100. Null when domain isn't on the curated list.</summary>
    double? AuthorityScore,
    /// <summary>Total citations across in-window scans.</summary>
    int CitationCount,
    /// <summary>Distinct ScanRuns in window where this Source was cited.</summary>
    int RetrievedInScans,
    /// <summary>Most recent ScanRun.CompletedAt that cited this Source. Null when no scans.</summary>
    DateTime? LastSeenAt);
