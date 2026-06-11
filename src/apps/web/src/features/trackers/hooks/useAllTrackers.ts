import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { trackersApi } from "@/api/trackersApi";
import type { RenameTrackerRequest } from "@/types/api";

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
 * Renames a tracker. Invalidates the workspace tracker list so the
 * sidebar selector + every list of trackers picks up the new label.
 * The current page's React Query cache doesn't need a separate
 * invalidation — the tracker's data (scans, lenses, schedule) is
 * keyed on tracker id, not name.
 */
export function useRenameTracker(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenameTrackerRequest) => trackersApi.rename(trackerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-trackers"] });
    },
  });
}

/**
 * Hard-deletes a tracker. On success navigates back to the owning
 * brand profile (the screen we're standing on after a delete is now
 * pointing at a deleted resource). Invalidates the tracker list +
 * scan-list caches so stale tracker rows disappear.
 */
export function useDeleteTracker(trackerId: string, brandId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => trackersApi.delete(trackerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-trackers"] });
      queryClient.removeQueries({ queryKey: ["tracker-schedule", trackerId] });
      queryClient.removeQueries({ queryKey: ["tracker-lenses", trackerId] });
      queryClient.removeQueries({ queryKey: ["tracker-overview"] });
      navigate({ to: "/brands/$brandId/profile", params: { brandId } });
    },
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
