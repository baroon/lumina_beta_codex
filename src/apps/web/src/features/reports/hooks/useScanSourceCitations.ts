import { useQuery } from "@tanstack/react-query";
import { sourcesApi } from "@/api/sourcesApi";

/**
 * Drawer drill-down query — citations for one source within one scan
 * (Phase 4 v1 plan §D15). Only enabled when both ids are provided so
 * the drawer's mount-fetch matches the controlled-open pattern.
 */
export function useScanSourceCitations(scanRunId: string, sourceId: string | null) {
  return useQuery({
    queryKey: ["scan-source-citations", scanRunId, sourceId],
    queryFn: () => sourcesApi.citationsForSource(scanRunId, sourceId!),
    enabled: !!scanRunId && !!sourceId,
  });
}
