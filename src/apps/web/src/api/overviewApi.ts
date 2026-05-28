import { apiClient } from "./apiClient";
import type { WorkspaceOverviewDto } from "@/types/api";

/**
 * Phase 4 v3 Slice A — workspace overview API client. Sibling of
 * trackersApi but workspace-scoped; Slices B + C add further methods
 * (competitive, depth) on this surface.
 */
export const overviewApi = {
  overview: (days = 30) => apiClient.get<WorkspaceOverviewDto>(`/api/overview?days=${days}`),
};
