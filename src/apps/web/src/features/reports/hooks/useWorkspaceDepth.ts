import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Phase 4 v3 Slice C — workspace depth read model. Per-platform brand
 * metrics, sentiment distribution, activity + topic heatmaps, recent
 * chats. Separate fetch from {@link useWorkspaceOverview} and
 * {@link useWorkspaceCompetitive} so each section payload is scoped.
 * Uses `keepPreviousData` so changing the date range keeps the section
 * mounted while the new payload loads.
 */
export function useWorkspaceDepth(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-depth", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.depth(resolveDateRange(selection)),
    placeholderData: keepPreviousData,
  });
}
