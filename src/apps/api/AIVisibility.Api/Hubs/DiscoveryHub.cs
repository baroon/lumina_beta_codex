using AIVisibility.Infrastructure;
using Microsoft.AspNetCore.SignalR;

namespace AIVisibility.Api.Hubs;

// Re-export the hub from Infrastructure for API mapping
// The actual DiscoveryHub class is in Infrastructure so IHubContext<DiscoveryHub> works there
