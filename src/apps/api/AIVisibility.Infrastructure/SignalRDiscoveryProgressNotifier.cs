using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure;

public interface IDiscoveryHub
{
    Task ReceiveProgress(DiscoveryProgressMessage message);
}

public record DiscoveryProgressMessage(
    Guid BrandId,
    string Status,
    int PagesCrawled,
    string? Message,
    int Step,
    int TotalSteps);

public class SignalRDiscoveryProgressNotifier : IDiscoveryProgressNotifier
{
    private readonly IHubContext<DiscoveryHub, IDiscoveryHub> _hubContext;
    private readonly ILogger<SignalRDiscoveryProgressNotifier> _logger;

    public SignalRDiscoveryProgressNotifier(
        IHubContext<DiscoveryHub, IDiscoveryHub> hubContext,
        ILogger<SignalRDiscoveryProgressNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyProgressAsync(Guid brandId, DiscoveryStatus status, int pagesCrawled,
        string? message = null, int step = 0, int totalSteps = 5,
        CancellationToken cancellationToken = default)
    {
        var progressMessage = new DiscoveryProgressMessage(brandId, status.ToString(), pagesCrawled, message, step, totalSteps);
        await _hubContext.Clients.Group($"brand-{brandId}").ReceiveProgress(progressMessage);
        _logger.LogDebug("Sent discovery progress for brand {BrandId}: {Status} (step {Step}/{TotalSteps})", brandId, status, step, totalSteps);
    }
}

// Placeholder hub class - real one is in Api project, but we need the type for IHubContext
public class DiscoveryHub : Hub<IDiscoveryHub>
{
    public async Task JoinBrandGroup(Guid brandId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"brand-{brandId}");
    }
}
