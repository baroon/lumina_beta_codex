namespace AIVisibility.Application.Interfaces;

/// <summary>Executes a scan run: processes its pending prompt runs and records answers.</summary>
public interface IScanExecutor
{
    Task ExecuteAsync(Guid scanRunId, CancellationToken cancellationToken = default);
}
