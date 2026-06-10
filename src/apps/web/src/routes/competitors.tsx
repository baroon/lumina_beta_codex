import { Swords } from "lucide-react";
import { ComingSoon } from "@/components/molecules/ComingSoon";
import { PageHeader } from "@/components/molecules/PageHeader";

/**
 * Placeholder shell for the workspace-wide Competitors analytics page
 * (step 13 of the navigation rollout plan). The eventual CompetitorsScreen
 * aggregates competitor mention / recommendation / share-of-voice across
 * the selected trackers.
 */
export function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitors"
        description="Competitive ranks aggregated across the selected trackers — mentions, recommendations, share of voice, and trend."
      />
      <ComingSoon
        icon={Swords}
        title="Cross-tracker competitor ranks"
        description="Compare every competitor against your tracked brands at workspace scope, with sortable columns and per-competitor drill-down."
      />
    </div>
  );
}
