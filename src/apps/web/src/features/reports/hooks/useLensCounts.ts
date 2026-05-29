import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Per-lens mention counts for the current workspace + date window.
 * Drives the inline count chip rendered next to each lens row in the
 * LensSelector dropdown so the user can spot empty lenses before
 * toggling. The query is deliberately keyed on the date range only —
 * not on the active lens filter — so the counts stay stable across
 * lens selections.
 */
export function useLensCounts(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-lens-counts", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.lensCounts(resolveDateRange(selection)),
    placeholderData: keepPreviousData,
  });
}
