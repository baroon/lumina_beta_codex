import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { sourcesApi } from "@/api/sourcesApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Workspace-wide domain-level citation feed for the /sources page (Domains
 * view). Wraps `GET /api/sources/domains?...` and threads the same seven
 * canonical filter dimensions the /overview + /competitors pages drive,
 * so the FE filter bar narrows source citations the same way it narrows
 * every other workspace report. All filter args default to empty arrays
 * meaning "no narrowing on this dimension".
 */
export function useWorkspaceDomains(
  selection: DateRangeSelection,
  trackerIds: readonly string[] = [],
  lensCodes: readonly string[] = [],
  topicNames: readonly string[] = [],
  productNames: readonly string[] = [],
  marketNames: readonly string[] = [],
  audienceNames: readonly string[] = [],
  sentimentValues: readonly string[] = [],
  platformCodes: readonly string[] = [],
) {
  const trackerKey = [...trackerIds].sort().join(",");
  const lensKey = [...lensCodes].sort().join(",");
  const topicKey = [...topicNames].sort().join(",");
  const productKey = [...productNames].sort().join(",");
  const marketKey = [...marketNames].sort().join(",");
  const audienceKey = [...audienceNames].sort().join(",");
  const sentimentKey = [...sentimentValues].sort().join(",");
  const platformKey = [...platformCodes].sort().join(",");
  return useQuery({
    queryKey: [
      "workspace-domains",
      serializeDateRangeSelection(selection),
      trackerKey,
      lensKey,
      topicKey,
      productKey,
      marketKey,
      audienceKey,
      sentimentKey,
      platformKey,
    ],
    queryFn: () =>
      sourcesApi.workspaceDomains(
        resolveDateRange(selection),
        trackerIds,
        lensCodes,
        topicNames,
        productNames,
        marketNames,
        audienceNames,
        sentimentValues,
        platformCodes,
      ),
    placeholderData: keepPreviousData,
  });
}
