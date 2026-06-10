import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/molecules/ComingSoon";
import { PageHeader } from "@/components/molecules/PageHeader";

/**
 * Placeholder shell for the workspace settings page (step 15 of the
 * navigation rollout plan — pulled forward so the new sidebar's Settings
 * entry resolves instead of 404-ing).
 */
export function SettingsWorkspacePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace settings"
        description="Workspace name, email preferences, and feature toggles."
      />
      <ComingSoon
        icon={Settings}
        title="Workspace settings"
        description="Workspace name, member invites, billing, integrations, and email preferences."
      />
    </div>
  );
}
