import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sourcesApi } from "@/api/sourcesApi";
import type { ScanSourcesDto, UpdateSourceClassificationResult } from "@/types/api";

interface UpdateInput {
  sourceId: string;
  brandId: string;
  sourceType: string;
}

/**
 * Mutation hook for the user-correction dropdown (Phase 4 v1 plan §D11/D20).
 * Optimistically patches the cached scan-sources list so the UI reflects the
 * new type immediately; rolls back if the server rejects.
 *
 * Receives <c>scanRunId</c> so the optimistic update knows which cache key
 * to touch.
 */
export function useUpdateSourceClassification(scanRunId: string) {
  const queryClient = useQueryClient();
  const cacheKey = ["scan-sources", scanRunId];

  return useMutation<
    UpdateSourceClassificationResult,
    Error,
    UpdateInput,
    { previous?: ScanSourcesDto }
  >({
    mutationFn: ({ sourceId, brandId, sourceType }) =>
      sourcesApi.updateClassification(sourceId, brandId, { sourceType }),

    onMutate: async ({ sourceId, sourceType }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<ScanSourcesDto>(cacheKey);

      if (previous) {
        queryClient.setQueryData<ScanSourcesDto>(cacheKey, {
          ...previous,
          sources: previous.sources.map((s) =>
            s.sourceId === sourceId
              ? {
                  ...s,
                  sourceType,
                  status: "UserCorrected",
                  provenanceSource: "UserCorrected",
                  confidenceScore: 1,
                }
              : s,
          ),
        });
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cacheKey, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });
}
