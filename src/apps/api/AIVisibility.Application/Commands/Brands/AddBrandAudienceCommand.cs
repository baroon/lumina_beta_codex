using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Adds a user-authored audience to a brand. Mirrors the topic / competitor
/// shape: Source = UserAdded, Confidence = 1.0, anchored to the brand's
/// most recent DiscoveryRun. Description defaults to null (deeper edits
/// land later).
/// </summary>
public record AddBrandAudienceCommand(Guid BrandId, string Name) : IRequest<AddBrandAudienceResult>;

public sealed record AddBrandAudienceResult(Guid AudienceId, string Name);
