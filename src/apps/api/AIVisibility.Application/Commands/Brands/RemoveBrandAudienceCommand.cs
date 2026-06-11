using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Removes an audience from a brand. Cascade FKs on
/// <c>prompt_audiences</c> and <c>tracker_audiences</c> handle junction
/// cleanup. The handler verifies the audience belongs to the supplied
/// brand before deleting.
/// </summary>
public record RemoveBrandAudienceCommand(Guid BrandId, Guid AudienceId) : IRequest;
