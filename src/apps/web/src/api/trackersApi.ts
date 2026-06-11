import { apiClient } from "./apiClient";
import type {
  CreateTrackerRequest,
  CreateTrackerResponse,
  TrackerListItemDto,
  TrackerSetupPreview,
} from "@/types/api";

export const trackersApi = {
  getSetupPreview: (brandId: string) =>
    apiClient.get<TrackerSetupPreview>(`/api/brands/${brandId}/trackers/setup-preview`),

  create: (brandId: string, data: CreateTrackerRequest) =>
    apiClient.post<CreateTrackerResponse>(`/api/brands/${brandId}/trackers`, data),

  list: () => apiClient.get<TrackerListItemDto[]>("/api/trackers"),

  delete: (trackerId: string) => apiClient.delete<void>(`/api/trackers/${trackerId}`),
};
