import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { brandsApi } from "@/api/brandsApi";
import type { CreateBrandRequest } from "@/types/api";

export function useBrandsList() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => brandsApi.list(),
  });
}

export function useBrand(brandId: string) {
  return useQuery({
    queryKey: ["brands", brandId],
    queryFn: () => brandsApi.getById(brandId),
    enabled: !!brandId,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateBrandRequest) => brandsApi.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      navigate({ to: "/brands/$brandId/discovery", params: { brandId: result.brandId } });
    },
  });
}
