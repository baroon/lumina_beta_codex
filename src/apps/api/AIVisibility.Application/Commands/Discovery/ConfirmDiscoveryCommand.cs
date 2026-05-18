using MediatR;

namespace AIVisibility.Application.Commands.Discovery;

public record ConfirmDiscoveryCommand(
    Guid BrandId,
    List<Guid> ConfirmedIds,
    List<Guid> DismissedIds) : IRequest<Unit>;
