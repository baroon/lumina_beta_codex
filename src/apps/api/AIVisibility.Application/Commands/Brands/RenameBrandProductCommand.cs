using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>Renames an existing brand product — same shape as RenameBrandTopicCommand.</summary>
public record RenameBrandProductCommand(Guid BrandId, Guid ProductId, string Name)
    : IRequest<RenameBrandProductResult>;

public sealed record RenameBrandProductResult(Guid ProductId, string Name);
