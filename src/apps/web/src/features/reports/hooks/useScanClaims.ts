import { useQuery } from "@tanstack/react-query";
import { claimsApi } from "@/api/claimsApi";

/**
 * Fetches the factual-claims list for a scan (Phase 4 measurement-model
 * expansion, item #14). Optional `reviewStatus` filter narrows to a
 * single status bucket; omitted = all claims.
 */
export function useScanClaims(scanRunId: string, reviewStatus?: string) {
  return useQuery({
    queryKey: ["scan-claims", scanRunId, reviewStatus ?? "all"],
    queryFn: () => claimsApi.forScan(scanRunId, reviewStatus),
    enabled: !!scanRunId,
  });
}
