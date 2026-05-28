import { useQuery } from "@tanstack/react-query";
import { competitorsApi } from "@/api/competitorsApi";

/**
 * Competitor view list query (Phase 4 Slice 4). Returns mention + rec
 * counts and derived rates per tracked competitor.
 */
export function useScanCompetitors(scanRunId: string) {
  return useQuery({
    queryKey: ["scan-competitors", scanRunId],
    queryFn: () => competitorsApi.forScan(scanRunId),
    enabled: !!scanRunId,
  });
}
