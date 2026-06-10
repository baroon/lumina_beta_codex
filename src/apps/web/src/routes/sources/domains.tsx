import { Globe } from "lucide-react";
import { ComingSoon } from "@/components/molecules/ComingSoon";
import { PageHeader } from "@/components/molecules/PageHeader";

/**
 * Placeholder shell for the workspace-wide Source Domains analytics page
 * (step 12 of the navigation rollout plan). Replaced by the real
 * DomainsScreen when the GET /api/sources/domains endpoint is wired up.
 */
export function SourcesDomainsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Source domains"
        description="Domain-level citation source view — which domains AI models cite when answering for your tracked brands."
      />
      <ComingSoon
        icon={Globe}
        title="Domain-level citation analysis"
        description="Source Retrieved trend, domains table with type breakdown, and per-domain citation rates."
      />
    </div>
  );
}
