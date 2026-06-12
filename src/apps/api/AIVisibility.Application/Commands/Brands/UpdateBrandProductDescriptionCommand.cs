using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Sets (or clears) the prose description on a single brand product.
/// Mirrors <see cref="UpdateBrandCompetitorDescriptionCommand"/>:
/// user-facing note, not a signal-extraction input, so the only
/// normalization is trim-and-null-empty plus a 2000-char cap to
/// prevent a runaway paste. Per-brand ownership is enforced.
/// </summary>
public record UpdateBrandProductDescriptionCommand(
    Guid BrandId,
    Guid ProductId,
    string? Description) : IRequest<UpdateBrandProductDescriptionResult>;

public sealed record UpdateBrandProductDescriptionResult(string? Description);
