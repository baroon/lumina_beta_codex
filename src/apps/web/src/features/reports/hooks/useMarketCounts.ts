import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Per-market mention counts for the current workspace + window. Drives
 * the inline count chip in `MarketSelector`. Workspace + date scoped
 * only — deliberately unfiltered by the active market filter so the
 * chip stays stable as the user toggles. Mirrors {@link useTopicCounts}.
 */
export function useMarketCounts(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-market-counts", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.marketCounts(resolveDateRange(selection)),
    placeholderData: keepPreviousData,
  });
}
