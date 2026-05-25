import { apiClient } from "./apiClient";
import type {
  AddCustomPromptRequest,
  ConfirmPromptsResult,
  GeneratePromptsResult,
  PromptList,
} from "@/types/api";

export interface RegenerateFilters {
  lensId?: string;
  topicId?: string;
}

export const promptsApi = {
  list: (trackerId: string) => apiClient.get<PromptList>(`/api/trackers/${trackerId}/prompts`),

  generate: (trackerId: string, filters?: RegenerateFilters) => {
    const params = new URLSearchParams();
    if (filters?.lensId) params.set("lensId", filters.lensId);
    if (filters?.topicId) params.set("topicId", filters.topicId);
    const qs = params.toString();
    return apiClient.post<GeneratePromptsResult>(
      `/api/trackers/${trackerId}/prompts/generate${qs ? `?${qs}` : ""}`,
    );
  },

  confirm: (trackerId: string) =>
    apiClient.post<ConfirmPromptsResult>(`/api/trackers/${trackerId}/prompts/confirm`),

  addCustom: (trackerId: string, data: AddCustomPromptRequest) =>
    apiClient.post<void>(`/api/trackers/${trackerId}/prompts`, data),

  update: (trackerId: string, promptId: string, data: { text: string }) =>
    apiClient.put<void>(`/api/trackers/${trackerId}/prompts/${promptId}`, data),

  remove: (trackerId: string, promptId: string) =>
    apiClient.delete<void>(`/api/trackers/${trackerId}/prompts/${promptId}`),
};
