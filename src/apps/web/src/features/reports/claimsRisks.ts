import type {
  WorkspaceBrandRiskFlagDto,
  WorkspaceFactualClaimDto,
  WorkspaceOverviewDto,
} from "@/types/api";

export type ClaimStatus = "Pending" | "Verified" | "Disputed" | "NeedsContext" | "Ignored";
export type RiskSeverity = "High" | "Medium" | "Low";

export function deriveClaimsRisksSummary(overview: WorkspaceOverviewDto | undefined) {
  const claims = overview?.recentFactualClaims ?? [];
  const risks = overview?.topBrandRiskFlags ?? [];
  return deriveClaimsRisksSummaryFromRows(claims, risks);
}

export function deriveClaimsRisksSummaryFromRows(
  claims: readonly WorkspaceFactualClaimDto[],
  risks: readonly WorkspaceBrandRiskFlagDto[],
) {
  const claimsToReview = claims.filter(
    (claim) => claim.reviewStatus === "Pending" || claim.reviewStatus === "NeedsContext",
  ).length;
  const disputedClaims = claims.filter((claim) => claim.reviewStatus === "Disputed").length;
  const highSeverity = risks.filter((risk) => risk.severity === "High").length;

  return {
    claimsToReview,
    disputedClaims,
    highSeverity,
    openRisks: claimsToReview + disputedClaims + risks.length,
  };
}

export function filterClaimsByStatus(
  claims: readonly WorkspaceFactualClaimDto[],
  status: ClaimStatus | null,
) {
  if (status == null) return claims;
  return claims.filter((claim) => claim.reviewStatus === status);
}

export function filterClaimsByType(
  claims: readonly WorkspaceFactualClaimDto[],
  claimType: string | null,
) {
  if (claimType == null) return claims;
  return claims.filter((claim) => claim.verifiability === claimType);
}

export function filterRisksBySeverity(
  risks: readonly WorkspaceBrandRiskFlagDto[],
  severity: RiskSeverity | null,
) {
  if (severity == null) return risks;
  return risks.filter((risk) => risk.severity === severity);
}

export function countClaimsByStatus(
  claims: readonly WorkspaceFactualClaimDto[],
): Record<ClaimStatus, number> {
  return {
    Pending: claims.filter((claim) => claim.reviewStatus === "Pending").length,
    Verified: claims.filter((claim) => claim.reviewStatus === "Verified").length,
    Disputed: claims.filter((claim) => claim.reviewStatus === "Disputed").length,
    NeedsContext: claims.filter((claim) => claim.reviewStatus === "NeedsContext").length,
    Ignored: claims.filter((claim) => claim.reviewStatus === "Ignored").length,
  };
}

export function countRisksBySeverity(
  risks: readonly WorkspaceBrandRiskFlagDto[],
): Record<RiskSeverity, number> {
  return {
    High: risks.filter((risk) => risk.severity === "High").length,
    Medium: risks.filter((risk) => risk.severity === "Medium").length,
    Low: risks.filter((risk) => risk.severity === "Low").length,
  };
}

export function countClaimsByType(
  claims: readonly WorkspaceFactualClaimDto[],
): Record<string, number> {
  return claims.reduce<Record<string, number>>((counts, claim) => {
    counts[claim.verifiability] = (counts[claim.verifiability] ?? 0) + 1;
    return counts;
  }, {});
}

export function deriveClaimRecommendedAction(claim: WorkspaceFactualClaimDto): string {
  if (claim.reviewStatus === "Disputed") return "Correct or add context";
  if (claim.reviewStatus === "NeedsContext") return "Add context";
  if (claim.reviewStatus === "Ignored") return "Ignored";
  if (claim.reviewStatus === "Verified") return "Monitor";
  if (claim.verifiability === "Verifiable") return "Verify against source";
  if (claim.verifiability === "Subjective") return "Needs context";
  return "Review claim";
}

export function deriveReviewWorkflowClaims(
  claims: readonly WorkspaceFactualClaimDto[],
): WorkspaceFactualClaimDto[] {
  return [...claims].sort((a, b) => {
    const statusPriority = claimWorkflowPriority(a) - claimWorkflowPriority(b);
    if (statusPriority !== 0) return statusPriority;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

function claimWorkflowPriority(claim: WorkspaceFactualClaimDto): number {
  if (claim.reviewStatus === "Disputed") return 0;
  if (claim.reviewStatus === "NeedsContext") return 1;
  if (claim.reviewStatus === "Pending") return 2;
  if (claim.reviewStatus === "Verified") return 3;
  return 4;
}
