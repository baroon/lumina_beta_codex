import { useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";

/**
 * Phase 4 v3 Slice C — workspace depth read model. Per-platform brand
 * metrics, sentiment distribution, activity + topic heatmaps, recent
 * chats. Separate fetch from {@link useWorkspaceOverview} and
 * {@link useWorkspaceCompetitive} so each section payload is scoped.
 */
export function useWorkspaceDepth(days = 30) {
  return useQuery({
    queryKey: ["workspace-depth", days],
    queryFn: () => overviewApi.depth(days),
  });
}
