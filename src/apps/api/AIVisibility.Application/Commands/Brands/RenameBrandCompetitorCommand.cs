using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>Renames an existing brand competitor — same shape as RenameBrandTopicCommand.</summary>
public record RenameBrandCompetitorCommand(Guid BrandId, Guid CompetitorId, string Name)
    : IRequest<RenameBrandCompetitorResult>;

public sealed record RenameBrandCompetitorResult(Guid CompetitorId, string Name);
