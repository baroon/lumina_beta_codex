import { apiClient } from "./apiClient";
import type {
  CreateTrackerRequest,
  CreateTrackerResponse,
  TrackerCompetitiveDto,
  TrackerDashboardDto,
  TrackerDepthDto,
  TrackerListItemDto,
  TrackerSetupPreview,
  TrackerTrendDto,
} from "@/types/api";

export const trackersApi = {
  getSetupPreview: (brandId: string) =>
    apiClient.get<TrackerSetupPreview>(`/api/brands/${brandId}/trackers/setup-preview`),

  create: (brandId: string, data: CreateTrackerRequest) =>
    apiClient.post<CreateTrackerResponse>(`/api/brands/${brandId}/trackers`, data),

  /** @deprecated Phase 4 v2 dashboard uses {@link dashboard} instead. Removed once the v2 frontend lands. */
  trend: (trackerId: string, days = 30) =>
    apiClient.get<TrackerTrendDto>(`/api/trackers/${trackerId}/trend?days=${days}`),

  /**
   * Phase 4 v2 dashboard endpoint — consolidated read model with hero
   * counts + per-entity trend series + top brands table.
   */
  dashboard: (trackerId: string, days = 30) =>
    apiClient.get<TrackerDashboardDto>(`/api/trackers/${trackerId}/dashboard?days=${days}`),

  /**
   * Phase 4 v2 Slice B competitive intelligence read model — sources +
   * domains + SoV + mention distribution + gap analysis + recommendation
   * rate. Separate fetch from {@link dashboard} so each payload stays
   * scoped.
   */
  competitive: (trackerId: string, days = 30) =>
    apiClient.get<TrackerCompetitiveDto>(
      `/api/trackers/${trackerId}/dashboard/competitive?days=${days}`,
    ),

  /**
   * Phase 4 v2 Slice C depth read model — per-platform brand metrics +
   * sentiment distribution + activity heatmap + topic heatmap + recent
   * chats. Separate fetch from {@link dashboard} and {@link competitive}
   * so each payload stays scoped.
   */
  depth: (trackerId: string, days = 30) =>
    apiClient.get<TrackerDepthDto>(`/api/trackers/${trackerId}/dashboard/depth?days=${days}`),

  list: () => apiClient.get<TrackerListItemDto[]>("/api/trackers"),
};
