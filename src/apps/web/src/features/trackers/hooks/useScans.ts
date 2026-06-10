import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { scansApi } from "@/api/scansApi";

export function useRunScan(trackerId: string) {
  return useMutation({
    mutationFn: () => scansApi.run(trackerId),
  });
}

/**
 * Scan list filtered to a single tracker. The backend endpoint is
 * workspace-wide (`GET /api/scans`); we filter client-side here because
 * (a) the workspace scan list is capped at 100 so the client filter is
 * cheap, and (b) the tracker hub doesn't justify a dedicated endpoint
 * yet. Promote to a server filter if scan volume per tracker grows.
 */
export function useTrackerScans(trackerId: string) {
  const all = useQuery({
    queryKey: ["all-scans"],
    queryFn: () => scansApi.list(),
  });
  const scans = useMemo(
    () => (all.data ?? []).filter((s) => s.trackerId === trackerId),
    [all.data, trackerId],
  );
  return { scans, isLoading: all.isLoading, isError: all.isError, error: all.error };
}

/** Polls the latest scan every 2s until it finishes (Completed/Failed). */
export function useLatestScan(trackerId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["latest-scan", trackerId],
    queryFn: () => scansApi.latest(trackerId),
    enabled: enabled && !!trackerId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "Completed" || status === "Failed" ? false : 2000;
    },
  });
}
