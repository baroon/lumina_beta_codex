import { useQuery } from "@tanstack/react-query";
import { trackersApi } from "@/api/trackersApi";

/**
 * Visibility Tracker dashboard trend query (Phase 4 Slice 6). Returns one
 * series per dashboard metric within a rolling window. Default 30 days;
 * caller passes a different number when the dashboard adds a time picker.
 */
export function useTrackerTrend(trackerId: string, days = 30) {
  return useQuery({
    queryKey: ["tracker-trend", trackerId, days],
    queryFn: () => trackersApi.trend(trackerId, days),
    enabled: !!trackerId,
  });
}
