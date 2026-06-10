import { MessageSquare } from "lucide-react";
import { ComingSoon } from "@/components/molecules/ComingSoon";
import { PageHeader } from "@/components/molecules/PageHeader";

/**
 * Placeholder shell for the workspace-wide Prompts analytics page (step
 * 11 of the navigation rollout plan). Renders here so the route is
 * reachable and shareable links work before the real PromptsScreen lands.
 */
export function PromptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompts"
        description="Per-prompt visibility, sentiment, position, and mention counts across the selected trackers."
      />
      <ComingSoon
        icon={MessageSquare}
        title="Prompt-level analysis"
        description="Filter by topic, model, lens, or tag. Drill into the full answer history for any prompt."
      />
    </div>
  );
}
