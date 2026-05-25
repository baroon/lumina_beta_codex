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
    mutationFn: (vars: { trackerId: string; visibilityLensId?: string; topicId?: string }) =>
      promptsApi.generate(vars.trackerId, {
        visibilityLensId: vars.visibilityLensId,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts", trackerId] }),
  });
}

export function useAddCustomPrompt(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddCustomPromptRequest) => promptsApi.addCustom(trackerId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts", trackerId] }),
  });
}

export function useUpdatePrompt(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { promptId: string; text: string }) =>
      promptsApi.update(trackerId, vars.promptId, { text: vars.text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts", trackerId] }),
  });
}
