using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Sets (or clears) the prose description on a single brand trust
/// signal. Mirrors <see cref="UpdateBrandCompetitorDescriptionCommand"/>:
/// user-facing note, not a signal-extraction input, so the only
/// normalization is trim-and-null-empty plus a 2000-char cap.
/// Per-brand ownership is enforced.
/// </summary>
public record UpdateBrandTrustSignalDescriptionCommand(
    Guid BrandId,
    Guid TrustSignalId,
    string? Description) : IRequest<UpdateBrandTrustSignalDescriptionResult>;

public sealed record UpdateBrandTrustSignalDescriptionResult(string? Description);
