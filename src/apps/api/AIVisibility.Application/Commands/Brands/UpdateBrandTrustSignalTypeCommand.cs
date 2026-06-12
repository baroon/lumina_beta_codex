using AIVisibility.Domain.Enums;
using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Recategorizes a single brand trust signal into one of the seven
/// <see cref="TrustSignalType"/> buckets. Users frequently want to
/// fix an LLM-inferred type ("this is a Certification, not an
/// Award"), and the discovery wizard's AddBrandTrustSignal helper
/// always defaults to <c>AwardsAndRecognitions</c>, so a per-signal
/// edit is the canonical way to move a row out of the default bucket.
/// Per-brand ownership is enforced before write.
/// </summary>
public record UpdateBrandTrustSignalTypeCommand(
    Guid BrandId,
    Guid TrustSignalId,
    TrustSignalType SignalType) : IRequest<UpdateBrandTrustSignalTypeResult>;

public sealed record UpdateBrandTrustSignalTypeResult(TrustSignalType SignalType);
