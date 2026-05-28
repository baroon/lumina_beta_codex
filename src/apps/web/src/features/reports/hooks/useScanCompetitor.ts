import { useQuery } from "@tanstack/react-query";
import { competitorsApi } from "@/api/competitorsApi";

/**
 * Competitor detail query (Phase 4 Slice 4, D17). Metric pivot + sources
 * cited on answers that mentioned this competitor.
 */
export function useScanCompetitor(scanRunId: string, competitorId: string | null) {
  return useQuery({
    queryKey: ["scan-competitor", scanRunId, competitorId],
    queryFn: () => competitorsApi.detail(scanRunId, competitorId!),
    enabled: !!scanRunId && !!competitorId,
  });
}
