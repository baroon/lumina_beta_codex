import { useQuery } from "@tanstack/react-query";
import { trackersApi } from "@/api/trackersApi";

/**
 * Visibility Tracker dashboard v2 read model (Phase 4 v2 Slice A).
 * One consolidated fetch returning hero counts, per-entity trend series,
 * and the top brands table for the given tracker + window.
 */
export function useTrackerDashboard(trackerId: string, days = 30) {
  return useQuery({
    queryKey: ["tracker-dashboard", trackerId, days],
    queryFn: () => trackersApi.dashboard(trackerId, days),
    enabled: !!trackerId,
  });
}
