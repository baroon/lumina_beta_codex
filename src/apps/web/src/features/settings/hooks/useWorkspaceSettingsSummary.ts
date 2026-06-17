import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { brandsApi } from "@/api/brandsApi";
import { trackersApi } from "@/api/trackersApi";
import type { WorkspaceSettingsSummary } from "@/features/settings/types";

export function useWorkspaceSettingsSummary() {
  const brands = useQuery({
    queryKey: ["settings-brands"],
    queryFn: () => brandsApi.list(),
  });
  const trackers = useQuery({
    queryKey: ["settings-trackers"],
    queryFn: () => trackersApi.list(),
  });

  const summary = useMemo<WorkspaceSettingsSummary>(() => {
    const trackerRows = trackers.data ?? [];
    return {
      brandCount: brands.data?.length ?? 0,
      trackerCount: trackerRows.length,
      activeTrackerCount: trackerRows.filter((tracker) => tracker.status === "Active").length,
      completedScanCount: trackerRows.reduce((sum, tracker) => sum + tracker.scanCount, 0),
    };
  }, [brands.data, trackers.data]);

  return {
    summary,
    isLoading: brands.isLoading || trackers.isLoading,
    isError: brands.isError || trackers.isError,
    error: brands.error ?? trackers.error,
    refetch: async () => {
      await Promise.all([brands.refetch(), trackers.refetch()]);
    },
  };
}
