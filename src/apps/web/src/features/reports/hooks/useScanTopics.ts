import { useQuery } from "@tanstack/react-query";
import { topicsApi } from "@/api/topicsApi";

/**
 * Fetches the Topic view list for a scan (Phase 4 Slice 3). 404 means the
 * scan doesn't exist; caller can show an empty state.
 */
export function useScanTopics(scanRunId: string) {
  return useQuery({
    queryKey: ["scan-topics", scanRunId],
    queryFn: () => topicsApi.forScan(scanRunId),
    enabled: !!scanRunId,
  });
}
