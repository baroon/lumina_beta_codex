import { useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";

/**
 * Phase 4 v3 Slice B — workspace competitive read model. Separate fetch
 * from {@link useWorkspaceOverview} so an aggregation failure in one
 * doesn't blank the whole page.
 */
export function useWorkspaceCompetitive(days = 30) {
  return useQuery({
    queryKey: ["workspace-competitive", days],
    queryFn: () => overviewApi.competitive(days),
  });
}
