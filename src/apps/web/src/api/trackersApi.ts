import { apiClient } from "./apiClient";
import type {
  CreateTrackerRequest,
  CreateTrackerResponse,
  TrackerDashboardDto,
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

  list: () => apiClient.get<TrackerListItemDto[]>("/api/trackers"),
};
