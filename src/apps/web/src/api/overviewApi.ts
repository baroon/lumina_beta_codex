import { apiClient } from "./apiClient";
import type { WorkspaceCompetitiveDto, WorkspaceDepthDto, WorkspaceOverviewDto } from "@/types/api";

/**
 * Phase 4 v3 — workspace overview API client. Three section endpoints
 * (overview / competitive / depth) so an aggregation failure in one
 * doesn't blank the page.
 */
export const overviewApi = {
  overview: (days = 30) => apiClient.get<WorkspaceOverviewDto>(`/api/overview?days=${days}`),
  competitive: (days = 30) =>
    apiClient.get<WorkspaceCompetitiveDto>(`/api/overview/competitive?days=${days}`),
  depth: (days = 30) => apiClient.get<WorkspaceDepthDto>(`/api/overview/depth?days=${days}`),
};
