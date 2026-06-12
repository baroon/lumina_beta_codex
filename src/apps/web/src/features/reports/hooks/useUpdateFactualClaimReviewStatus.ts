import { useMutation, useQueryClient } from "@tanstack/react-query";
import { factualClaimsApi } from "@/api/factualClaimsApi";
import type { UpdateFactualClaimReviewStatusResult } from "@/types/api";

interface UpdateInput {
  claimId: string;
  reviewStatus: string;
}

/**
 * Mutation hook for the FactualClaimsCard verdict buttons (item #14
 * write action). Invalidates the workspace-overview cache on success
 * so the badge color flips alongside any FE that consumes the same
 * key. No optimistic update — the workspace overview is the only
 * surface today, and a refetch round-trip is cheap on click.
 */
export function useUpdateFactualClaimReviewStatus() {
  const queryClient = useQueryClient();

  return useMutation<UpdateFactualClaimReviewStatusResult, Error, UpdateInput>({
    mutationFn: ({ claimId, reviewStatus }) =>
      factualClaimsApi.updateReviewStatus(claimId, { reviewStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspace-overview"] });
    },
  });
}
