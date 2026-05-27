import { useQuery } from "@tanstack/react-query";
import { sourcesApi } from "@/api/sourcesApi";

/**
 * Fetches the Source/Citation view list for a scan (Phase 4 Slice 2).
 * 404 means the scan doesn't exist; caller can show an empty state.
 */
export function useScanSources(scanRunId: string) {
  return useQuery({
    queryKey: ["scan-sources", scanRunId],
    queryFn: () => sourcesApi.forScan(scanRunId),
    enabled: !!scanRunId,
  });
}
