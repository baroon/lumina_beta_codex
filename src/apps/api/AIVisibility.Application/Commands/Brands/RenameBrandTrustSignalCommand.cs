using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>Renames an existing brand trust signal — same shape as RenameBrandTopicCommand.</summary>
public record RenameBrandTrustSignalCommand(Guid BrandId, Guid TrustSignalId, string Name)
    : IRequest<RenameBrandTrustSignalResult>;

public sealed record RenameBrandTrustSignalResult(Guid TrustSignalId, string Name);
