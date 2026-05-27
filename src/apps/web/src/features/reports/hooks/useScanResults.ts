import { useQuery } from "@tanstack/react-query";
import { scansApi } from "@/api/scansApi";

/**
 * Fetches the Scan Results read-model for the Scan Results page
 * (Slice (d) reporting). Backend returns 404 when:
 *   - The scan does not exist, or
 *   - The scan exists but its AnalysisJob has not been created yet (analysis
 *     hasn't started yet — extraction is still pre-flight).
 * Caller can use isError + the 404 case to render a placeholder while
 * aggregation is in flight.
 */
export function useScanResults(scanRunId: string) {
  return useQuery({
    queryKey: ["scan-results", scanRunId],
    queryFn: () => scansApi.results(scanRunId),
    enabled: !!scanRunId,
  });
}
