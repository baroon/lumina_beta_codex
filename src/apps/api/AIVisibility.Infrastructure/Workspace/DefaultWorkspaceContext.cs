using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Workspace;

/// <summary>
/// Phase 4 v3 placeholder implementation of <see cref="IWorkspaceContext"/>.
/// Always returns <see cref="Guid.Empty"/> — the single implicit workspace
/// the runtime operates on until auth + multi-tenancy land. Swapped out
/// for an auth-context-backed implementation in a future phase.
/// </summary>
public class DefaultWorkspaceContext : IWorkspaceContext
{
    public Guid WorkspaceId => Guid.Empty;
}
