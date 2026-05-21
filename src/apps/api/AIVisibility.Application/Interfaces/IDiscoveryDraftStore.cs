using AIVisibility.Application.Queries.Discovery;

namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Holds discovery suggestions transiently between the background extraction job and the
/// confirmation wizard. Suggestions are never persisted to the candidate tables — only the
/// user-confirmed set is. A miss (expiry/restart) simply means discovery is re-run.
/// </summary>
public interface IDiscoveryDraftStore
{
    void Save(Guid discoveryRunId, DiscoveryResultsDto draft);
    DiscoveryResultsDto? Get(Guid discoveryRunId);
}
