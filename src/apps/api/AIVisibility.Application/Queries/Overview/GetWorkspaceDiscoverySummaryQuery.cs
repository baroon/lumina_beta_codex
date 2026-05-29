using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Workspace discovery summary — counts + names for every dimension the
/// user filled in during the discovery flow (products, markets, audiences,
/// topics, trust signals). Drives the inline "Tracking N products · M
/// markets · …" strip at the top of the Workspace Overview so the user
/// gets immediate visual confirmation that their setup work is reflected
/// in the system. NOT a filter source — purely informational.
/// </summary>
public record GetWorkspaceDiscoverySummaryQuery() : IRequest<DiscoverySummaryDto>;

public sealed record DiscoverySummaryDto(
    IReadOnlyList<DiscoveryDimensionDto> Products,
    IReadOnlyList<DiscoveryDimensionDto> Markets,
    IReadOnlyList<DiscoveryDimensionDto> Audiences,
    IReadOnlyList<DiscoveryDimensionDto> Topics,
    IReadOnlyList<DiscoveryDimensionDto> TrustSignals);

public sealed record DiscoveryDimensionDto(Guid Id, string Name);
