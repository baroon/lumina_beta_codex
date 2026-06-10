import { Link2 } from "lucide-react";
import { ComingSoon } from "@/components/molecules/ComingSoon";
import { PageHeader } from "@/components/molecules/PageHeader";

/**
 * Placeholder shell for the workspace-wide Source URLs analytics page
 * (step 12 of the navigation rollout plan). Replaced by the real
 * SourceUrlsScreen when the GET /api/sources/urls endpoint is wired up.
 */
export function SourcesUrlsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Source URLs"
        description="URL-level citation view — specific pages AI models retrieved when answering for your tracked brands."
      />
      <ComingSoon
        icon={Link2}
        title="URL-level citation analysis"
        description="Source Retrieved trend, URLs table with URL type + domain type, and per-URL citation rates."
      />
    </div>
  );
}
