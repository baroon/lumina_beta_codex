import { apiClient } from "./apiClient";
import type { DateRange } from "@/components/molecules/DateRangePicker";
import type {
  LensCountDto,
  WorkspaceCompetitiveDto,
  WorkspaceDepthDto,
  WorkspaceOverviewDto,
} from "@/types/api";

/**
 * Build the `?from=&to=&lensCodes=` query string for the overview endpoints.
 * `from=null` reads as "all time" (BE skips the lower-bound predicate),
 * `to=null` reads as "up to now" (BE resolves to UTC now). An empty
 * `lensCodes` array is treated as "all lenses" and omitted entirely so the
 * BE skips the lens predicate. Empty string when nothing is set.
 */
function buildOverviewQuery(range: DateRange, lensCodes: readonly string[]): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  // ASP.NET model binding for `string[]` repeats the key: ?lensCodes=A&lensCodes=B.
  for (const code of lensCodes) params.append("lensCodes", code);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * Phase 4 v3 — workspace overview API client. Three section endpoints
 * (overview / competitive / depth) so an aggregation failure in one
 * doesn't blank the page.
 */
export const overviewApi = {
  overview: (range: DateRange, lensCodes: readonly string[]) =>
    apiClient.get<WorkspaceOverviewDto>(`/api/overview${buildOverviewQuery(range, lensCodes)}`),
  competitive: (range: DateRange, lensCodes: readonly string[]) =>
    apiClient.get<WorkspaceCompetitiveDto>(
      `/api/overview/competitive${buildOverviewQuery(range, lensCodes)}`,
    ),
  depth: (range: DateRange, lensCodes: readonly string[]) =>
    apiClient.get<WorkspaceDepthDto>(`/api/overview/depth${buildOverviewQuery(range, lensCodes)}`),
  /**
   * Per-lens mention counts for the current window. Deliberately
   * unfiltered by lens — the chip stays stable as the user toggles.
   */
  lensCounts: (range: DateRange) =>
    apiClient.get<LensCountDto[]>(`/api/overview/lens-counts${buildOverviewQuery(range, [])}`),
};
