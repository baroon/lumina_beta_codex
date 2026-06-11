using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Removes a competitor from a brand. Cascade FKs on
/// <c>prompt_competitors</c> and <c>tracker_competitors</c> clean up
/// the junction rows automatically. The handler verifies the
/// competitor actually belongs to the supplied brand before deleting
/// so a stale FE cannot remove a row from another brand.
/// </summary>
public record RemoveBrandCompetitorCommand(Guid BrandId, Guid CompetitorId) : IRequest;
