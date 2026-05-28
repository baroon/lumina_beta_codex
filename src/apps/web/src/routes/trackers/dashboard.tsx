import { Navigate } from "@tanstack/react-router";

/**
 * Deprecated route — the per-tracker dashboard at /trackers/{id}/dashboard
 * was the v2 surface. Phase 4 v3 retires it in favour of the workspace
 * Overview at `/overview`. The route is kept as a redirect so any
 * in-flight bookmarks or external links still land on a useful screen.
 */
export function TrackerDashboardPage() {
  return <Navigate to="/overview" replace />;
}
