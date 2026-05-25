using System.Threading.Channels;
using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Scanning;

/// <summary>Unbounded in-process channel of scan-run ids for the background runner.</summary>
public class ScanQueue : IScanQueue
{
    private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>();

    public void Enqueue(Guid scanRunId) => _channel.Writer.TryWrite(scanRunId);

    public ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAsync(cancellationToken);
}
