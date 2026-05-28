import { apiClient } from "./apiClient";
import type { DateRange } from "@/components/molecules/DateRangePicker";
import type { WorkspaceCompetitiveDto, WorkspaceDepthDto, WorkspaceOverviewDto } from "@/types/api";

/**
 * Build the `?from=&to=` query string for the overview endpoints. Both
 * parameters are optional: `from=null` reads as "all time" (BE skips the
 * lower-bound predicate), `to=null` reads as "up to now" (BE resolves to
 * UTC now). Empty string when neither is set.
 */
function buildRangeQuery(range: DateRange): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * Phase 4 v3 — workspace overview API client. Three section endpoints
 * (overview / competitive / depth) so an aggregation failure in one
 * doesn't blank the page.
 */
export const overviewApi = {
  overview: (range: DateRange) =>
    apiClient.get<WorkspaceOverviewDto>(`/api/overview${buildRangeQuery(range)}`),
  competitive: (range: DateRange) =>
    apiClient.get<WorkspaceCompetitiveDto>(`/api/overview/competitive${buildRangeQuery(range)}`),
  depth: (range: DateRange) =>
    apiClient.get<WorkspaceDepthDto>(`/api/overview/depth${buildRangeQuery(range)}`),
};
