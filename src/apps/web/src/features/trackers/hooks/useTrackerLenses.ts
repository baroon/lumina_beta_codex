import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trackerLensesApi } from "@/api/trackerLensesApi";
import type { UpdateTrackerLensesRequest } from "@/types/api";

export function useTrackerLensesSetup(trackerId: string) {
  return useQuery({
    queryKey: ["tracker-lenses", trackerId],
    queryFn: () => trackerLensesApi.getSetup(trackerId),
    enabled: !!trackerId,
  });
}

export function useUpdateTrackerLenses(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTrackerLensesRequest) => trackerLensesApi.update(trackerId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracker-lenses", trackerId] }),
  });
}
