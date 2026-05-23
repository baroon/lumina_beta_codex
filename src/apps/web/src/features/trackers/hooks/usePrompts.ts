import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { promptsApi } from "@/api/promptsApi";

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
    mutationFn: (trackerId: string) => promptsApi.generate(trackerId),
    onSuccess: (_data, trackerId) => {
      queryClient.invalidateQueries({ queryKey: ["prompts", trackerId] });
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
