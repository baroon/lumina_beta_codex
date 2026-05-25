namespace AIVisibility.Application.Interfaces;

/// <summary>In-process queue of scan runs awaiting background execution.</summary>
public interface IScanQueue
{
    void Enqueue(Guid scanRunId);
    ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);
}
