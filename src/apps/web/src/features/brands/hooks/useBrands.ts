import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { brandsApi } from "@/api/brandsApi";
import { discoveryApi } from "@/api/discoveryApi";
import type { CreateBrandRequest, UpdateBrandAliasesRequest } from "@/types/api";

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

/**
 * Brand-feature wrapper around the discovery results endpoint. Shares the
 * `["discovery", brandId]` query key with the discovery feature's own
 * hook so React Query keeps a single cache entry — this hook exists only
 * because the cross-feature lint rule bans `brands` from importing
 * `@/features/discovery/*`. Identical fetch + cache semantics either way.
 */
export function useBrandDiscoveryResults(brandId: string) {
  return useQuery({
    queryKey: ["discovery", brandId],
    queryFn: () => discoveryApi.getResults(brandId),
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

/**
 * Mutates the brand's alias list. Aliases live on Brand.Aliases but
 * surface to the FE through the discovery results DTO, so the
 * `["discovery", brandId]` cache is invalidated on success.
 */
export function useUpdateBrandAliases(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBrandAliasesRequest) => brandsApi.updateAliases(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}
