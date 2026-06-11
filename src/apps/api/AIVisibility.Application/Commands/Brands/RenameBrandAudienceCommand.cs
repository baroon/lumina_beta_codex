using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>Renames an existing brand audience — same shape as RenameBrandTopicCommand.</summary>
public record RenameBrandAudienceCommand(Guid BrandId, Guid AudienceId, string Name)
    : IRequest<RenameBrandAudienceResult>;

public sealed record RenameBrandAudienceResult(Guid AudienceId, string Name);
