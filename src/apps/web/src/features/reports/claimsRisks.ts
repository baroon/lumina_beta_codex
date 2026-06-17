import type { WorkspaceOverviewDto } from "@/types/api";

export function deriveClaimsRisksSummary(overview: WorkspaceOverviewDto | undefined) {
  const claims = overview?.recentFactualClaims ?? [];
  const risks = overview?.topBrandRiskFlags ?? [];
  const claimsToReview = claims.filter((claim) => claim.reviewStatus === "Pending").length;
  const disputedClaims = claims.filter((claim) => claim.reviewStatus === "Disputed").length;
  const highSeverity = risks.filter((risk) => risk.severity === "High").length;

  return {
    claimsToReview,
    disputedClaims,
    highSeverity,
    openRisks: claimsToReview + disputedClaims + risks.length,
  };
}
