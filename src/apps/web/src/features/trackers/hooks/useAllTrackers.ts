import { useMemo } from "react";
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

/**
 * Find a single tracker by id from the workspace list. Shares the
 * `all-trackers` query cache so this and the tracker selector / brand
 * list / tracker hub all read from one source.
 */
export function useTrackerSummary(trackerId: string) {
  const query = useAllTrackers();
  const tracker = useMemo(
    () => query.data?.find((t) => t.trackerId === trackerId),
    [query.data, trackerId],
  );
  return {
    tracker,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
