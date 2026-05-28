import { apiClient } from "./apiClient";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";

/**
 * Phase 4 v3 — workspace overview API client. Sibling of trackersApi but
 * workspace-scoped. Slice C adds a `depth` method to this surface.
 */
export const overviewApi = {
  overview: (days = 30) => apiClient.get<WorkspaceOverviewDto>(`/api/overview?days=${days}`),
  competitive: (days = 30) =>
    apiClient.get<WorkspaceCompetitiveDto>(`/api/overview/competitive?days=${days}`),
};
