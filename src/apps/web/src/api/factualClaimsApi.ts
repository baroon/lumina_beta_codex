import { apiClient } from "./apiClient";
import type {
  UpdateFactualClaimReviewStatusRequest,
  UpdateFactualClaimReviewStatusResult,
} from "@/types/api";

/**
 * Review-status mutation for the only write action on the otherwise
 * append-only FactualClaim row (Phase 4 measurement-model expansion,
 * item #14). The BE walks claim → mention → answer → prompt → tracker
 * → brand → workspace and refuses any claim that doesn't belong to
 * the current workspace; the FE just fires the new status.
 */
export const factualClaimsApi = {
  updateReviewStatus: (id: string, data: UpdateFactualClaimReviewStatusRequest) =>
    apiClient.put<UpdateFactualClaimReviewStatusResult>(
      `/api/factual-claims/${id}/review-status`,
      data,
    ),
};
