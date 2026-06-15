import { apiClient } from "./apiClient";
import type { DateRange } from "@/components/molecules/DateRangePicker";
import type {
  AddCustomPromptRequest,
  ConfirmPromptsResult,
  GeneratePromptsResult,
  PromptAnswerHistoryDto,
  PromptList,
  WorkspacePromptsDto,
} from "@/types/api";

/**
 * Build the `?from=&to=&trackerIds=` query string for the workspace
 * prompts endpoint. Matches the convention of `overviewApi` so the BE
 * filter shape stays consistent.
 */
function buildWorkspacePromptsQuery(range: DateRange, trackerIds: readonly string[]): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  for (const id of trackerIds) params.append("trackerIds", id);
  const s = params.toString();
  return s ? `?${s}` : "";
}

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

  /**
   * Workspace-wide prompt inventory at GET /api/prompts. Distinct from
   * the per-tracker `list` above — used by the workspace /prompts page.
   */
  workspace: (range: DateRange, trackerIds: readonly string[] = []) =>
    apiClient.get<WorkspacePromptsDto>(
      `/api/prompts${buildWorkspacePromptsQuery(range, trackerIds)}`,
    ),

  /**
   * Per-prompt answer history at GET /api/prompts/{promptId}/answers.
   * Drives the row-click drawer on the workspace /prompts page. The BE
   * returns an empty payload (200, not 404) for prompts outside the
   * caller's workspace so the FE can render a clean empty state without
   * branching on error.
   */
  answerHistory: (promptId: string, range: DateRange) => {
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from.toISOString());
    if (range.to) params.set("to", range.to.toISOString());
    const qs = params.toString();
    return apiClient.get<PromptAnswerHistoryDto>(
      `/api/prompts/${promptId}/answers${qs ? `?${qs}` : ""}`,
    );
  },
};
