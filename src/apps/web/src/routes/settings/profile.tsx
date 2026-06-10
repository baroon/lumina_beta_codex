import { User } from "lucide-react";
import { ComingSoon } from "@/components/molecules/ComingSoon";
import { PageHeader } from "@/components/molecules/PageHeader";

/**
 * Placeholder shell for the user profile settings page (step 15 of the
 * navigation rollout plan — pulled forward so the new sidebar's Settings
 * entry resolves instead of 404-ing).
 */
export function SettingsProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your personal preferences, display settings, and account details."
      />
      <ComingSoon
        icon={User}
        title="Profile preferences"
        description="Display name, avatar, theme, and notification preferences."
      />
    </div>
  );
}
