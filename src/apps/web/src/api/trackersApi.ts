import { apiClient } from "./apiClient";
import type {
  CreateTrackerRequest,
  CreateTrackerResponse,
  TrackerListItemDto,
  TrackerSetupPreview,
  TrackerTrendDto,
} from "@/types/api";

export const trackersApi = {
  getSetupPreview: (brandId: string) =>
    apiClient.get<TrackerSetupPreview>(`/api/brands/${brandId}/trackers/setup-preview`),

  create: (brandId: string, data: CreateTrackerRequest) =>
    apiClient.post<CreateTrackerResponse>(`/api/brands/${brandId}/trackers`, data),

  trend: (trackerId: string, days = 30) =>
    apiClient.get<TrackerTrendDto>(`/api/trackers/${trackerId}/trend?days=${days}`),

  list: () => apiClient.get<TrackerListItemDto[]>("/api/trackers"),
};
