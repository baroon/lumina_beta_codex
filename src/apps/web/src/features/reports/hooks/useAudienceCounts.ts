import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Per-audience mention counts for the audience pill on /overview. Same
 * stability rules as the other count hooks — workspace + window scoped,
 * not filtered by the active audience selection.
 */
export function useAudienceCounts(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-audience-counts", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.audienceCounts(resolveDateRange(selection)),
    placeholderData: keepPreviousData,
  });
}
