import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Phase 4 v3 Slice A — workspace overview read model. Aggregates
 * hero counts + per-entity trend series + Top Entities table across
 * the workspace. Slice B (competitive) and Slice C (depth) have
 * sibling hooks fetching from their own endpoints.
 *
 * The query is keyed on the picker selection (`preset:30` etc.) so a
 * rolling-window preset doesn't burst the cache on every render — the
 * resolver still snaps to a fresh "now" when the fetch fires.
 *
 * `placeholderData: keepPreviousData` retains the prior payload while a
 * new range is in flight so the page stays mounted (no jarring full-page
 * `<LoadingPage />` flash on every date-range change); the screen reads
 * `isFetching` for a subtle "refreshing" affordance during the swap.
 */
export function useWorkspaceOverview(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-overview", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.overview(resolveDateRange(selection)),
    placeholderData: keepPreviousData,
  });
}
