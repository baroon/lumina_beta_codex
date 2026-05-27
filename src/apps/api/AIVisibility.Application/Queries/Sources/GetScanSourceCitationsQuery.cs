using MediatR;

namespace AIVisibility.Application.Queries.Sources;

/// <summary>
/// Side-drawer query for the Source/Citation view (Phase 4 v1 plan §D15).
/// Returns the per-citation drill-down for one source: which prompt produced
/// the citation, on which platform/lens, and a snippet of the AI answer.
/// Handler returns null when the scan does not exist.
/// </summary>
public record GetScanSourceCitationsQuery(Guid ScanRunId, Guid SourceId) : IRequest<ScanSourceCitationsDto?>;

public sealed record ScanSourceCitationsDto(
    Guid ScanRunId,
    Guid SourceId,
    string SourceName,
    string? Domain,
    IReadOnlyList<SourceCitationDto> Citations);

public sealed record SourceCitationDto(
    Guid CitationId,
    Guid AIAnswerId,
    string CitationType,
    /// <summary>Specific URL the citation pointed at, if the LLM included one.</summary>
    string? Url,
    /// <summary>Trimmed answer snippet (first ~400 chars) so the drawer can render quickly.</summary>
    string AnswerSnippet,
    string PromptText,
    string PlatformCode,
    string PlatformName,
    string? LensName,
    DateTime CitedAt);
