using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Workspace discovery summary — names of every dimension (products,
/// markets, audiences, topics, trust signals) the user captured during
/// discovery, organized into per-brand groups. The grouped shape is
/// what the tracker dropdowns in the Workspace Overview need: each
/// dropdown shows a section per brand so the user can see where each
/// value came from. Filter behavior on the overview is still
/// name-based (a name shared across brands toggles every brand that
/// has it), so the UI groups for context but the BE filter shape is
/// unchanged.
/// </summary>
public record GetWorkspaceDiscoverySummaryQuery() : IRequest<DiscoverySummaryDto>;

public sealed record DiscoverySummaryDto(
    IReadOnlyList<BrandedDimensionGroupDto> Products,
    IReadOnlyList<BrandedDimensionGroupDto> Markets,
    IReadOnlyList<BrandedDimensionGroupDto> Audiences,
    IReadOnlyList<BrandedDimensionGroupDto> Topics,
    IReadOnlyList<BrandedDimensionGroupDto> TrustSignals);

/// <summary>
/// One brand's slice of a dimension list — used as a section header in
/// the FE tracker dropdowns. Items are deduplicated within the brand
/// (case-insensitive name match) so a brand discovered twice doesn't
/// show the same topic row twice; duplicates ACROSS brands are kept on
/// purpose so each brand's section is complete.
/// </summary>
public sealed record BrandedDimensionGroupDto(
    Guid BrandId,
    string BrandName,
    IReadOnlyList<DiscoveryDimensionDto> Items);

public sealed record DiscoveryDimensionDto(Guid Id, string Name);
