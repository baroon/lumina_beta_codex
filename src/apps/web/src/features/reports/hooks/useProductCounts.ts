import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Per-product mention counts for the current workspace + window. Drives
 * the inline count chip in `ProductSelector`. Workspace + date scoped
 * only — deliberately unfiltered by the active product filter so the
 * chip stays stable as the user toggles. Mirrors {@link useTopicCounts}.
 */
export function useProductCounts(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-product-counts", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.productCounts(resolveDateRange(selection)),
    placeholderData: keepPreviousData,
  });
}
