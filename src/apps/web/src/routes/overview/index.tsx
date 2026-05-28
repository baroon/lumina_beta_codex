import { WorkspaceOverviewScreen } from "@/features/reports/components/WorkspaceOverviewScreen";

/**
 * Phase 4 v3 Slice A — `/overview` route. Renders the workspace-wide
 * comparison surface. Default landing target post-onboarding (wired up
 * in Slice C alongside the per-tracker dashboard deprecation).
 */
export function OverviewPage() {
  return <WorkspaceOverviewScreen />;
}
