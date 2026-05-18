using MediatR;

namespace AIVisibility.Application.Commands.Brands;

public record CreateBrandCommand(
    string Name,
    string WebsiteUrl,
    Guid WorkspaceId) : IRequest<CreateBrandResult>;

public record CreateBrandResult(
    Guid BrandId,
    Guid DiscoveryRunId);
