import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Workspace overview data scoped to a single tracker for the tracker
 * hub's Overview tab. Functionally identical to the reports feature's
 * `useWorkspaceOverview`, but lives here so the trackers feature does
 * not import from the reports feature (ESLint cross-feature rule).
 * The shared piece is the underlying API client + DTO types.
 */
export function useTrackerOverview(selection: DateRangeSelection, trackerId: string) {
  return useQuery({
    queryKey: ["tracker-overview", serializeDateRangeSelection(selection), trackerId],
    queryFn: () =>
      overviewApi.overview(resolveDateRange(selection), [], [], [], [], [], [trackerId]),
    placeholderData: keepPreviousData,
    enabled: !!trackerId,
  });
}
