import { apiClient } from "./apiClient";
import type { ScanCompetitorDetailDto, ScanCompetitorsDto } from "@/types/api";

/**
 * Competitor view API surface (Phase 4 Slice 4). Two scan-scoped endpoints —
 * list pivots Competitor-scope ScanMetric rows, detail joins citations on
 * competitor-mention answers.
 */
export const competitorsApi = {
  forScan: (scanRunId: string) =>
    apiClient.get<ScanCompetitorsDto>(`/api/scans/${scanRunId}/competitors`),

  detail: (scanRunId: string, competitorId: string) =>
    apiClient.get<ScanCompetitorDetailDto>(`/api/scans/${scanRunId}/competitors/${competitorId}`),
};
