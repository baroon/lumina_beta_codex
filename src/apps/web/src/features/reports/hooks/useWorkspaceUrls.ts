import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { sourcesApi } from "@/api/sourcesApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Workspace-wide URL-level citation feed for the /sources page (URLs
 * view). Mirrors useWorkspaceDomains — same seven canonical filter
 * dimensions plumb through.
 */
export function useWorkspaceUrls(
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
      "workspace-urls",
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
      sourcesApi.workspaceUrls(
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
