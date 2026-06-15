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
export function useWorkspaceCompetitive(
  selection: DateRangeSelection,
  lensCodes: readonly string[],
  topicNames: readonly string[],
  productNames: readonly string[],
  marketNames: readonly string[],
  audienceNames: readonly string[],
  trackerIds: readonly string[] = [],
  sentimentValues: readonly string[] = [],
  platformCodes: readonly string[] = [],
) {
  const lensKey = [...lensCodes].sort().join(",");
  const topicKey = [...topicNames].sort().join(",");
  const productKey = [...productNames].sort().join(",");
  const marketKey = [...marketNames].sort().join(",");
  const audienceKey = [...audienceNames].sort().join(",");
  const trackerKey = [...trackerIds].sort().join(",");
  const sentimentKey = [...sentimentValues].sort().join(",");
  const platformKey = [...platformCodes].sort().join(",");
  return useQuery({
    queryKey: [
      "workspace-competitive",
      serializeDateRangeSelection(selection),
      lensKey,
      topicKey,
      productKey,
      marketKey,
      audienceKey,
      trackerKey,
      sentimentKey,
      platformKey,
    ],
    queryFn: () =>
      overviewApi.competitive(
        resolveDateRange(selection),
        lensCodes,
        topicNames,
        productNames,
        marketNames,
        audienceNames,
        trackerIds,
        sentimentValues,
        platformCodes,
      ),
    placeholderData: keepPreviousData,
  });
}
