import { apiClient } from "./apiClient";
import type {
  TrackerLensesSetupDto,
  UpdateTrackerLensesRequest,
  UpdateTrackerLensesResult,
} from "@/types/api";

export const trackerLensesApi = {
  getSetup: (trackerId: string) =>
    apiClient.get<TrackerLensesSetupDto>(`/api/trackers/${trackerId}/lenses`),

  update: (trackerId: string, data: UpdateTrackerLensesRequest) =>
    apiClient.put<UpdateTrackerLensesResult>(`/api/trackers/${trackerId}/lenses`, data),
};
