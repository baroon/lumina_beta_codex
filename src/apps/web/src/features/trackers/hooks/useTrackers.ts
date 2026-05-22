import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trackersApi } from "@/api/trackersApi";
import type { CreateTrackerRequest } from "@/types/api";

export function useTrackerSetupPreview(brandId: string) {
  return useQuery({
    queryKey: ["tracker-setup-preview", brandId],
    queryFn: () => trackersApi.getSetupPreview(brandId),
    enabled: !!brandId,
  });
}

export function useCreateTracker(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTrackerRequest) => trackersApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackers", brandId] });
    },
  });
}
