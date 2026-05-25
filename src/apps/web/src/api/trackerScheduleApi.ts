import { apiClient } from "./apiClient";
import type {
  ConfigureTrackerScheduleRequest,
  ConfigureTrackerScheduleResult,
  TrackerScheduleSetup,
} from "@/types/api";

export const trackerScheduleApi = {
  getSetup: (trackerId: string) =>
    apiClient.get<TrackerScheduleSetup>(`/api/trackers/${trackerId}/schedule`),

  configure: (trackerId: string, data: ConfigureTrackerScheduleRequest) =>
    apiClient.put<ConfigureTrackerScheduleResult>(`/api/trackers/${trackerId}/schedule`, data),
};
