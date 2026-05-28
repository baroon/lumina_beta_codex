import { useQuery } from "@tanstack/react-query";
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
 */
export function useWorkspaceOverview(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-overview", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.overview(resolveDateRange(selection)),
  });
}
