import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discoveryApi } from "@/api/discoveryApi";
import type { ConfirmDiscoveryRequest } from "@/types/api";

export function useDiscoveryResults(brandId: string) {
  return useQuery({
    queryKey: ["discovery", brandId],
    queryFn: () => discoveryApi.getResults(brandId),
    enabled: !!brandId,
  });
}

export function useConfirmDiscovery(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConfirmDiscoveryRequest) => discoveryApi.confirm(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
      queryClient.invalidateQueries({ queryKey: ["brands", brandId] });
    },
  });
}
