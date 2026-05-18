using AIVisibility.Domain.Enums;

namespace AIVisibility.Application.Interfaces;

public interface IDiscoveryProgressNotifier
{
    Task NotifyProgressAsync(Guid brandId, DiscoveryStatus status, int pagesCrawled,
        string? message = null, int step = 0, int totalSteps = 5,
        CancellationToken cancellationToken = default);
}
