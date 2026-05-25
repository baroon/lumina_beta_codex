import { apiClient } from "./apiClient";
import type { RunScanResult, ScanStatus } from "@/types/api";

export const scansApi = {
  run: (trackerId: string) => apiClient.post<RunScanResult>(`/api/trackers/${trackerId}/scans`, {}),

  latest: (trackerId: string) =>
    apiClient.get<ScanStatus>(`/api/trackers/${trackerId}/scans/latest`),
};
