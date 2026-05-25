using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>Background service that drains the scan queue and executes each run in its own scope.</summary>
public class ScanRunner : BackgroundService
{
    private readonly IScanQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScanRunner> _logger;

    public ScanRunner(IScanQueue queue, IServiceScopeFactory scopeFactory, ILogger<ScanRunner> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            Guid scanRunId;
            try
            {
                scanRunId = await _queue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var executor = scope.ServiceProvider.GetRequiredService<IScanExecutor>();
                await executor.ExecuteAsync(scanRunId, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Scan run {ScanRunId} failed to execute", scanRunId);
            }
        }
    }
}
