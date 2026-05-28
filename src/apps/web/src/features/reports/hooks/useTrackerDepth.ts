import { useQuery } from "@tanstack/react-query";
import { trackersApi } from "@/api/trackersApi";

/**
 * Phase 4 v2 Slice C — tracker dashboard depth read model. Per-platform
 * brand metrics, sentiment distribution, activity + topic heatmaps,
 * recent chats. Separate fetch from {@link useTrackerDashboard} and
 * {@link useTrackerCompetitive} so each section's payload is scoped.
 */
export function useTrackerDepth(trackerId: string, days = 30) {
  return useQuery({
    queryKey: ["tracker-depth", trackerId, days],
    queryFn: () => trackersApi.depth(trackerId, days),
    enabled: !!trackerId,
  });
}
