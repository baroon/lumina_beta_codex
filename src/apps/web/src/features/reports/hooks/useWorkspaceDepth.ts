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
export function useWorkspaceDepth(
  selection: DateRangeSelection,
  lensCodes: readonly string[],
  topicNames: readonly string[],
  productNames: readonly string[],
  marketNames: readonly string[],
  audienceNames: readonly string[],
  trackerIds: readonly string[] = [],
) {
  const lensKey = [...lensCodes].sort().join(",");
  const topicKey = [...topicNames].sort().join(",");
  const productKey = [...productNames].sort().join(",");
  const marketKey = [...marketNames].sort().join(",");
  const audienceKey = [...audienceNames].sort().join(",");
  const trackerKey = [...trackerIds].sort().join(",");
  return useQuery({
    queryKey: [
      "workspace-depth",
      serializeDateRangeSelection(selection),
      lensKey,
      topicKey,
      productKey,
      marketKey,
      audienceKey,
      trackerKey,
    ],
    queryFn: () =>
      overviewApi.depth(
        resolveDateRange(selection),
        lensCodes,
        topicNames,
        productNames,
        marketNames,
        audienceNames,
        trackerIds,
      ),
    placeholderData: keepPreviousData,
  });
}
