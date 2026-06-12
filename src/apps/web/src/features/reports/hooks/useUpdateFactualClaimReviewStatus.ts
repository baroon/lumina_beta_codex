import { useMutation, useQueryClient } from "@tanstack/react-query";
import { factualClaimsApi } from "@/api/factualClaimsApi";
import type { UpdateFactualClaimReviewStatusResult } from "@/types/api";

interface UpdateInput {
  claimId: string;
  reviewStatus: string;
}

/**
 * Mutation hook for the verdict buttons on both the workspace
 * FactualClaimsCard and the per-scan ScanClaimsScreen (item #14
 * write action). Invalidates both caches on success so the new
 * status reflects on whichever surface the user is looking at.
 * No optimistic update — the refetch round-trip is cheap on click.
 */
export function useUpdateFactualClaimReviewStatus() {
  const queryClient = useQueryClient();

  return useMutation<UpdateFactualClaimReviewStatusResult, Error, UpdateInput>({
    mutationFn: ({ claimId, reviewStatus }) =>
      factualClaimsApi.updateReviewStatus(claimId, { reviewStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspace-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["scan-claims"] });
    },
  });
}
