using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Adds a user-authored trust signal to a brand. Same shape as the
/// topic / competitor commands. SignalType defaults to
/// <c>AwardsAndRecognitions</c> (an arbitrary but non-misleading
/// starting bucket; a per-signal type edit lands in a follow-up),
/// Description to null.
/// </summary>
public record AddBrandTrustSignalCommand(Guid BrandId, string Name)
    : IRequest<AddBrandTrustSignalResult>;

public sealed record AddBrandTrustSignalResult(Guid TrustSignalId, string Name);
