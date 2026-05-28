import { useQuery } from "@tanstack/react-query";
import { trackersApi } from "@/api/trackersApi";

/**
 * Phase 4 v2 Slice B — tracker dashboard competitive intelligence read
 * model. Separate fetch from {@link useTrackerDashboard} so each payload
 * stays scoped to its dashboard section.
 */
export function useTrackerCompetitive(trackerId: string, days = 30) {
  return useQuery({
    queryKey: ["tracker-competitive", trackerId, days],
    queryFn: () => trackersApi.competitive(trackerId, days),
    enabled: !!trackerId,
  });
}
