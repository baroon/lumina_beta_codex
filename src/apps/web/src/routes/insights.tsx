import { TrendingUp } from "lucide-react";
import { ComingSoon } from "@/components/molecules/ComingSoon";
import { PageHeader } from "@/components/molecules/PageHeader";

/**
 * Placeholder shell for the workspace-wide Insights page (step 14 of the
 * navigation rollout plan). Ships behind a BETA chip — first real version
 * uses templated narrative copy from existing metrics; LLM-generated copy
 * lands later.
 */
export function InsightsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="Narrative ranking and performance matrix across your tracked brands and competitors."
      />
      <ComingSoon
        icon={TrendingUp}
        title="Narrative ranking"
        description='"You’re #N in AI Visibility — Brand X, Y, Z lead." Performance matrix, top earnings, and competitive position summary.'
        beta
      />
    </div>
  );
}
