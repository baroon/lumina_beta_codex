import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Phase 4 v3 Slice B — workspace competitive read model. Separate fetch
 * from {@link useWorkspaceOverview} so an aggregation failure in one
 * doesn't blank the whole page. Uses `keepPreviousData` so changing the
 * date range doesn't unmount the section.
 */
export function useWorkspaceCompetitive(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-competitive", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.competitive(resolveDateRange(selection)),
    placeholderData: keepPreviousData,
  });
}
