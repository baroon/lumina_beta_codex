import { apiClient } from "./apiClient";
import type { DateRange } from "@/components/molecules/DateRangePicker";
import type {
  AudienceCountDto,
  DiscoverySummaryDto,
  LensCountDto,
  MarketCountDto,
  ProductCountDto,
  TopicCountDto,
  WorkspaceCompetitiveDto,
  WorkspaceDepthDto,
  WorkspaceOverviewDto,
} from "@/types/api";

/**
 * Build the `?from=&to=&lensCodes=&topicNames=` query string for the
 * overview endpoints. `from=null` reads as "all time" (BE skips the
 * lower-bound predicate), `to=null` reads as "up to now" (BE resolves to
 * UTC now). Empty `lensCodes` / `topicNames` arrays are treated as
 * "no filter" and omitted entirely so the BE skips the predicate. Empty
 * string when nothing is set.
 */
function buildOverviewQuery(
  range: DateRange,
  lensCodes: readonly string[],
  topicNames: readonly string[] = [],
  productNames: readonly string[] = [],
  marketNames: readonly string[] = [],
  audienceNames: readonly string[] = [],
  trackerIds: readonly string[] = [],
): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  // ASP.NET model binding for `string[]` repeats the key: ?lensCodes=A&lensCodes=B.
  for (const code of lensCodes) params.append("lensCodes", code);
  for (const name of topicNames) params.append("topicNames", name);
  for (const name of productNames) params.append("productNames", name);
  for (const name of marketNames) params.append("marketNames", name);
  for (const name of audienceNames) params.append("audienceNames", name);
  for (const id of trackerIds) params.append("trackerIds", id);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * Phase 4 v3 — workspace overview API client. Three section endpoints
 * (overview / competitive / depth) so an aggregation failure in one
 * doesn't blank the page.
 */
export const overviewApi = {
  overview: (
    range: DateRange,
    lensCodes: readonly string[],
    topicNames: readonly string[],
    productNames: readonly string[],
    marketNames: readonly string[],
    audienceNames: readonly string[],
    trackerIds: readonly string[] = [],
  ) =>
    apiClient.get<WorkspaceOverviewDto>(
      `/api/overview${buildOverviewQuery(range, lensCodes, topicNames, productNames, marketNames, audienceNames, trackerIds)}`,
    ),
  competitive: (
    range: DateRange,
    lensCodes: readonly string[],
    topicNames: readonly string[],
    productNames: readonly string[],
    marketNames: readonly string[],
    audienceNames: readonly string[],
    trackerIds: readonly string[] = [],
  ) =>
    apiClient.get<WorkspaceCompetitiveDto>(
      `/api/overview/competitive${buildOverviewQuery(range, lensCodes, topicNames, productNames, marketNames, audienceNames, trackerIds)}`,
    ),
  depth: (
    range: DateRange,
    lensCodes: readonly string[],
    topicNames: readonly string[],
    productNames: readonly string[],
    marketNames: readonly string[],
    audienceNames: readonly string[],
    trackerIds: readonly string[] = [],
  ) =>
    apiClient.get<WorkspaceDepthDto>(
      `/api/overview/depth${buildOverviewQuery(range, lensCodes, topicNames, productNames, marketNames, audienceNames, trackerIds)}`,
    ),
  /**
   * Per-lens mention counts for the current window. Deliberately
   * unfiltered by lens — the chip stays stable as the user toggles.
   */
  lensCounts: (range: DateRange) =>
    apiClient.get<LensCountDto[]>(`/api/overview/lens-counts${buildOverviewQuery(range, [])}`),
  /** Per-topic mention counts for the topic selector chip. Same stability rules as lens-counts. */
  topicCounts: (range: DateRange) =>
    apiClient.get<TopicCountDto[]>(`/api/overview/topic-counts${buildOverviewQuery(range, [])}`),
  /** Per-product mention counts for the product selector chip. Same stability rules. */
  productCounts: (range: DateRange) =>
    apiClient.get<ProductCountDto[]>(
      `/api/overview/product-counts${buildOverviewQuery(range, [])}`,
    ),
  /** Per-market mention counts for the market selector chip. */
  marketCounts: (range: DateRange) =>
    apiClient.get<MarketCountDto[]>(`/api/overview/market-counts${buildOverviewQuery(range, [])}`),
  /** Per-audience mention counts for the audience selector chip. */
  audienceCounts: (range: DateRange) =>
    apiClient.get<AudienceCountDto[]>(
      `/api/overview/audience-counts${buildOverviewQuery(range, [])}`,
    ),
  /**
   * Workspace-level discovery summary (products / markets / audiences /
   * topics / trust signals). Workspace-scoped, no filters — drives the
   * inline "Tracking N products · …" strip above the controls row.
   */
  discoverySummary: () => apiClient.get<DiscoverySummaryDto>("/api/overview/discovery-summary"),
};
