import { useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";

/**
 * Phase 4 v3 Slice A — workspace overview read model. Aggregates
 * hero counts + per-entity trend series + Top Entities table across
 * the workspace. Slice B (competitive) and Slice C (depth) have
 * sibling hooks fetching from their own endpoints.
 */
export function useWorkspaceOverview(days = 30) {
  return useQuery({
    queryKey: ["workspace-overview", days],
    queryFn: () => overviewApi.overview(days),
  });
}
