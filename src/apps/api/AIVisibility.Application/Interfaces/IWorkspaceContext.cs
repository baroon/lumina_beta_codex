namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Provides the current workspace identity to query handlers.
///
/// Phase 4 v3 introduces this as the boundary for workspace-scoped
/// aggregations (Workspace Overview). The current implementation always
/// returns <see cref="Guid.Empty"/> because the runtime has no auth /
/// multi-tenancy yet — every Brand row in the database is implicitly
/// part of the same "workspace". When auth + tenancy land, a real
/// implementation reads the workspace from the HTTP context and every
/// call site picks it up transparently.
/// </summary>
public interface IWorkspaceContext
{
    /// <summary>
    /// The current workspace id. Always <see cref="Guid.Empty"/> for v3.
    /// Handlers MUST filter by this column even though it's a no-op today,
    /// so that a future auth-bearing implementation requires zero handler
    /// changes.
    /// </summary>
    Guid WorkspaceId { get; }
}
