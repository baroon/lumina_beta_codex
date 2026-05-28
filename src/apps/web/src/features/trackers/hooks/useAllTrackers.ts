import { useQuery } from "@tanstack/react-query";
import { trackersApi } from "@/api/trackersApi";

/**
 * Flat list of trackers across brands for the /trackers page (Phase 4
 * Slice 7). Basic — no pagination, no filters; pulls every row. Returns
 * tracker id + name + brand + status + scan stats so the list links into
 * each tracker's dashboard.
 */
export function useAllTrackers() {
  return useQuery({
    queryKey: ["all-trackers"],
    queryFn: () => trackersApi.list(),
  });
}
