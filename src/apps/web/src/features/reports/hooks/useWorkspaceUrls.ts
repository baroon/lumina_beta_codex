import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { sourcesApi } from "@/api/sourcesApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Workspace-wide URL-level citation feed for the /sources/urls page.
 * Wraps `GET /api/sources/urls?from=&to=&trackerIds=...`.
 */
export function useWorkspaceUrls(
  selection: DateRangeSelection,
  trackerIds: readonly string[] = [],
) {
  const trackerKey = [...trackerIds].sort().join(",");
  return useQuery({
    queryKey: ["workspace-urls", serializeDateRangeSelection(selection), trackerKey],
    queryFn: () => sourcesApi.workspaceUrls(resolveDateRange(selection), trackerIds),
    placeholderData: keepPreviousData,
  });
}
