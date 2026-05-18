namespace AIVisibility.Application.Commands.Discovery;

public interface IRunDiscoveryJobHandler
{
    Task ExecuteAsync(Guid brandId, Guid discoveryRunId, CancellationToken cancellationToken);
}
