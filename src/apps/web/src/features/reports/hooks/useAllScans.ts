import { useQuery } from "@tanstack/react-query";
import { scansApi } from "@/api/scansApi";

/**
 * Cross-tracker scan list for the temporary /scans navigation page.
 * Backend caps results at 100; if the list ever needs to grow beyond
 * that, swap for paginated queries.
 */
export function useAllScans() {
  return useQuery({
    queryKey: ["all-scans"],
    queryFn: () => scansApi.list(),
  });
}
