using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Discovery;
using Microsoft.Extensions.Caching.Memory;

namespace AIVisibility.Infrastructure.Discovery;

public class MemoryDiscoveryDraftStore : IDiscoveryDraftStore
{
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(2);
    private readonly IMemoryCache _cache;

    public MemoryDiscoveryDraftStore(IMemoryCache cache) => _cache = cache;

    public void Save(Guid discoveryRunId, DiscoveryResultsDto draft) =>
        _cache.Set(Key(discoveryRunId), draft, Ttl);

    public DiscoveryResultsDto? Get(Guid discoveryRunId) =>
        _cache.TryGetValue(Key(discoveryRunId), out DiscoveryResultsDto? draft) ? draft : null;

    private static string Key(Guid discoveryRunId) => $"discovery-draft:{discoveryRunId}";
}
