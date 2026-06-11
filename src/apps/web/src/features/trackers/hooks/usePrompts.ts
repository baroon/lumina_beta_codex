import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { promptsApi } from "@/api/promptsApi";
import type { AddCustomPromptRequest } from "@/types/api";

export function usePrompts(trackerId: string) {
  return useQuery({
    queryKey: ["prompts", trackerId],
    queryFn: () => promptsApi.list(trackerId),
    enabled: !!trackerId,
  });
}

export function useGeneratePrompts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { trackerId: string; lensId?: string; topicId?: string }) =>
      promptsApi.generate(vars.trackerId, {
        lensId: vars.lensId,
        topicId: vars.topicId,
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["prompts", vars.trackerId] });
    },
  });
}

export function useConfirmPrompts(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => promptsApi.confirm(trackerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts", trackerId] }),
  });
}

export function useRemovePrompt(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (promptId: string) => promptsApi.remove(trackerId, promptId),
    onSuccess: () => invalidatePromptCaches(queryClient, trackerId),
  });
}

export function useAddCustomPrompt(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddCustomPromptRequest) => promptsApi.addCustom(trackerId, data),
    onSuccess: () => invalidatePromptCaches(queryClient, trackerId),
  });
}

export function useUpdatePrompt(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { promptId: string; text: string }) =>
      promptsApi.update(trackerId, vars.promptId, { text: vars.text }),
    onSuccess: () => invalidatePromptCaches(queryClient, trackerId),
  });
}

/**
 * Prompt mutations affect two cache surfaces: the per-tracker list
 * (TrackerHub Prompts tab) and the workspace-wide inventory (/prompts
 * page). The per-tracker key is exact; the workspace key prefix matches
 * every filter / window combination so a mutation forces a fresh fetch
 * regardless of which slice the user is currently viewing.
 */
function invalidatePromptCaches(queryClient: ReturnType<typeof useQueryClient>, trackerId: string) {
  queryClient.invalidateQueries({ queryKey: ["prompts", trackerId] });
  queryClient.invalidateQueries({ queryKey: ["workspace-prompts"] });
}
