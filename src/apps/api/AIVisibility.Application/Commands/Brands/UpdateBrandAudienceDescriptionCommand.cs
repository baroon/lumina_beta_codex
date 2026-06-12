using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Sets (or clears) the prose description on a single brand audience.
/// Mirrors <see cref="UpdateBrandCompetitorDescriptionCommand"/>:
/// user-facing note, not a signal-extraction input, so the only
/// normalization is trim-and-null-empty plus a 2000-char cap.
/// Per-brand ownership is enforced.
/// </summary>
public record UpdateBrandAudienceDescriptionCommand(
    Guid BrandId,
    Guid AudienceId,
    string? Description) : IRequest<UpdateBrandAudienceDescriptionResult>;

public sealed record UpdateBrandAudienceDescriptionResult(string? Description);
