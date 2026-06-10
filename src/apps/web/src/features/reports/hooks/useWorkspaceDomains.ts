import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { sourcesApi } from "@/api/sourcesApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Workspace-wide domain-level citation feed for the /sources/domains
 * page. Wraps `GET /api/sources/domains?from=&to=&trackerIds=...` and
 * respects the sidebar TrackerSelector scope via `trackerIds`.
 */
export function useWorkspaceDomains(
  selection: DateRangeSelection,
  trackerIds: readonly string[] = [],
) {
  const trackerKey = [...trackerIds].sort().join(",");
  return useQuery({
    queryKey: ["workspace-domains", serializeDateRangeSelection(selection), trackerKey],
    queryFn: () => sourcesApi.workspaceDomains(resolveDateRange(selection), trackerIds),
    placeholderData: keepPreviousData,
  });
}
