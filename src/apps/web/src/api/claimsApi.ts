import { apiClient } from "./apiClient";
import type { ScanClaimsDto } from "@/types/api";

/**
 * Scan-scoped factual-claims API (Phase 4 measurement-model expansion,
 * item #14). The optional `reviewStatus` query param lets the FE show
 * "Pending review" inbox separately from "All claims" without two routes.
 */
export const claimsApi = {
  forScan: (scanRunId: string, reviewStatus?: string) => {
    const query = reviewStatus ? `?reviewStatus=${encodeURIComponent(reviewStatus)}` : "";
    return apiClient.get<ScanClaimsDto>(`/api/scans/${scanRunId}/claims${query}`);
  },
};
