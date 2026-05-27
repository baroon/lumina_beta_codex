using MediatR;

namespace AIVisibility.Application.Queries.Sources;

/// <summary>
/// Source/Citation view list query (Phase 4 v1 plan §Slice 2, D9). Returns
/// every <c>Source</c> cited in this scan with its brand-scoped
/// classification, citation count, and the set of platforms whose answers
/// cited it. Handler returns null when the scan does not exist; the
/// controller maps that to 404.
/// </summary>
public record GetScanSourcesQuery(Guid ScanRunId) : IRequest<ScanSourcesDto?>;

public sealed record ScanSourcesDto(
    Guid ScanRunId,
    Guid BrandId,
    IReadOnlyList<SourceListItemDto> Sources);

public sealed record SourceListItemDto(
    Guid SourceId,
    string SourceName,
    string? Domain,
    string? NormalizedDomain,
    /// <summary>SourceType enum code (e.g. "Editorial"). Matches source_types.code.</summary>
    string SourceType,
    /// <summary>ClassificationStatus enum code (Suggested / Active / UserCorrected / Unknown).</summary>
    string Status,
    /// <summary>ClassificationSource enum code (RuleBased / KnownDomainList / LLMClassified / UserConfirmed / UserCorrected) — drives the provenance icon.</summary>
    string ProvenanceSource,
    double ConfidenceScore,
    int CitationCount,
    IReadOnlyList<SourcePlatformDto> Platforms);

public sealed record SourcePlatformDto(
    Guid PlatformId,
    string Code,
    string Name);
