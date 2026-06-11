import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { brandsApi } from "@/api/brandsApi";
import { discoveryApi } from "@/api/discoveryApi";
import type {
  AddBrandTopicRequest,
  CreateBrandRequest,
  UpdateBrandAliasesRequest,
  UpdateBrandProfileRequest,
} from "@/types/api";

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

/**
 * Mutates the brand's identity fields (shortDescription / industry /
 * category / positioning). Like aliases, these surface to the FE via
 * the discovery results DTO so the discovery cache is invalidated on
 * success.
 */
export function useUpdateBrandProfile(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBrandProfileRequest) => brandsApi.updateProfile(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Adds a user-authored Topic to the brand. The BE anchors the new row
 * to the brand's most recent DiscoveryRun and stamps Source = UserAdded.
 * Invalidates the discovery cache so the chip list re-renders.
 */
export function useAddBrandTopic(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddBrandTopicRequest) => brandsApi.addTopic(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Removes a Topic from the brand. Cascade FKs handle prompt_topics
 * and tracker_topics junction cleanup; we only need to invalidate
 * the discovery cache.
 */
export function useRemoveBrandTopic(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => brandsApi.removeTopic(brandId, topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}
