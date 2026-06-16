using MediatR;

namespace AIVisibility.Application.Queries.Sources;

/// <summary>
/// Workspace-scoped URL-level citation source view for the /sources/urls
/// page. Per-URL rows aggregating citations across selected trackers in
/// window — one row per <c>SourceUrl</c> (citations without a SourceUrl
/// are skipped; they show up on the /sources/domains page only).
/// </summary>
public record GetWorkspaceUrlsQuery(
    DateTime? From,
    DateTime? To,
    IReadOnlyList<Guid>? TrackerIds = null,
    // Mirrors GetWorkspaceDomainsQuery — see that file for semantics.
    IReadOnlyList<string>? LensCodes = null,
    IReadOnlyList<string>? TopicNames = null,
    IReadOnlyList<string>? ProductNames = null,
    IReadOnlyList<string>? MarketNames = null,
    IReadOnlyList<string>? AudienceNames = null,
    IReadOnlyList<string>? SentimentValues = null,
    IReadOnlyList<string>? PlatformCodes = null) : IRequest<WorkspaceUrlsDto>;

public sealed record WorkspaceUrlsDto(
    Guid WorkspaceId,
    DateTime? From,
    DateTime To,
    IReadOnlyList<WorkspaceUrlRowDto> Urls);

public sealed record WorkspaceUrlRowDto(
    Guid SourceUrlId,
    string Url,
    string NormalizedUrl,
    /// <summary>Page title scraped at extraction time. Null when extraction couldn't pull one.</summary>
    string? Title,
    Guid SourceId,
    string SourceName,
    string? NormalizedDomain,
    /// <summary>Dominant SourceType across the workspace's brand classifications. "Unknown" when none exists.</summary>
    string SourceType,
    int CitationCount,
    int RetrievedInScans,
    DateTime? LastSeenAt);
