import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trackerScheduleApi } from "@/api/trackerScheduleApi";
import type { ConfigureTrackerScheduleRequest } from "@/types/api";

export function useTrackerScheduleSetup(trackerId: string) {
  return useQuery({
    queryKey: ["tracker-schedule", trackerId],
    queryFn: () => trackerScheduleApi.getSetup(trackerId),
    enabled: !!trackerId,
  });
}

export function useConfigureTrackerSchedule(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfigureTrackerScheduleRequest) =>
      trackerScheduleApi.configure(trackerId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracker-schedule", trackerId] }),
  });
}
