import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { brandsApi } from "@/api/brandsApi";
import { sourcesApi } from "@/api/sourcesApi";
import type { BrandDto, UpdateSourceClassificationResult } from "@/types/api";

/**
 * Thin local read of the workspace's brands list — small subset of
 * <c>useBrandsList</c> in the brands feature, duplicated here because
 * the cross-feature lint rule bans <c>reports</c> from importing
 * <c>features/brands/*</c>. Reuses the same <c>["brands"]</c> query
 * key so React Query shares the cache entry.
 */
export function useWorkspaceBrandsForClassification() {
  return useQuery<BrandDto[]>({
    queryKey: ["brands"],
    queryFn: () => brandsApi.list(),
  });
}

interface UpdateInput {
  sourceId: string;
  sourceType: string;
}

/**
 * Workspace-scope variant of the per-scan classification mutation.
 * Same PUT endpoint, but the row's displayed "dominant SourceType
 * across brands" is server-computed, so we skip optimistic updates
 * and invalidate both <c>workspace-domains</c> and
 * <c>workspace-urls</c> on success — the URL view shares the same
 * dominant type per Source.
 */
export function useUpdateWorkspaceSourceClassification(brandId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<UpdateSourceClassificationResult, Error, UpdateInput>({
    mutationFn: ({ sourceId, sourceType }) => {
      if (!brandId) {
        return Promise.reject(new Error("Pick a brand to classify against."));
      }
      return sourcesApi.updateClassification(sourceId, brandId, { sourceType });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspace-domains"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-urls"] });
    },
  });
}
