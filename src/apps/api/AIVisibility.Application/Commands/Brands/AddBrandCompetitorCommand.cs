using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Adds a user-authored competitor to a brand. Same shape as
/// <see cref="AddBrandTopicCommand"/>: Source = UserAdded, Confidence
/// = 1.0, anchored to the brand's most recent DiscoveryRun. Aliases
/// default to an empty list and Domain to null; deeper edits to those
/// fields land in a follow-up.
/// </summary>
public record AddBrandCompetitorCommand(Guid BrandId, string Name)
    : IRequest<AddBrandCompetitorResult>;

public sealed record AddBrandCompetitorResult(Guid CompetitorId, string Name);
