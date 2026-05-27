import { apiClient } from "./apiClient";
import type { ScanTopicDetailDto, ScanTopicsDto } from "@/types/api";

/**
 * Topic view API surface (Phase 4 Slice 3). Both endpoints are scan-scoped
 * — Topic IDs are stable across scans but the metrics are per-scan.
 */
export const topicsApi = {
  forScan: (scanRunId: string) => apiClient.get<ScanTopicsDto>(`/api/scans/${scanRunId}/topics`),

  detail: (scanRunId: string, topicId: string) =>
    apiClient.get<ScanTopicDetailDto>(`/api/scans/${scanRunId}/topics/${topicId}`),
};
