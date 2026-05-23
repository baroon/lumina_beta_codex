import { apiClient } from "./apiClient";
import type { ConfirmPromptsResult, GeneratePromptsResult, PromptList } from "@/types/api";

export const promptsApi = {
  list: (trackerId: string) => apiClient.get<PromptList>(`/api/trackers/${trackerId}/prompts`),

  generate: (trackerId: string) =>
    apiClient.post<GeneratePromptsResult>(`/api/trackers/${trackerId}/prompts/generate`),

  confirm: (trackerId: string) =>
    apiClient.post<ConfirmPromptsResult>(`/api/trackers/${trackerId}/prompts/confirm`),

  remove: (trackerId: string, promptId: string) =>
    apiClient.delete<void>(`/api/trackers/${trackerId}/prompts/${promptId}`),
};
