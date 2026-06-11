using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Removes a trust signal from a brand. Trust signals do not have a
/// junction table set today (no <c>prompt_trust_signals</c> or
/// <c>tracker_trust_signals</c>), so the delete just removes the row
/// after verifying brand ownership.
/// </summary>
public record RemoveBrandTrustSignalCommand(Guid BrandId, Guid TrustSignalId) : IRequest;
