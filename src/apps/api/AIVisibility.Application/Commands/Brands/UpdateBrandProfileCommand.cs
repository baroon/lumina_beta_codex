using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Inline edit for the four free-text BrandProfile fields surfaced on
/// the brand profile page. Updates the existing BrandProfile row in
/// place — Source / Confidence / DiscoveryRunId stay untouched (those
/// reflect how the row was originally derived, not the latest edit).
/// Each field is independently nullable: passing null clears it,
/// passing whitespace trims to empty which we also treat as null so
/// the DB stays clean of " " values.
/// </summary>
public record UpdateBrandProfileCommand(
    Guid BrandId,
    string? ShortDescription,
    string? Industry,
    string? Category,
    string? Positioning) : IRequest<UpdateBrandProfileResult>;

public sealed record UpdateBrandProfileResult(
    string? ShortDescription,
    string? Industry,
    string? Category,
    string? Positioning);
