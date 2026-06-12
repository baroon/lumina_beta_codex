import type { EntityTrendSeriesDto } from "@/types/api";

/**
 * Resolves the per-entity visibility series for a row, using the
 * metric name that matches the row's entity type. Returns undefined
 * when the series isn't on the workspace overview yet (e.g. only
 * one scan in the window, or the metric was never produced).
 *
 * Lives in `lib/` rather than next to EntityTrendDrillDown so that
 * the .tsx component file only exports components (keeps Vite's
 * react-refresh boundary clean).
 */
export function findEntityTrend(
  series: readonly EntityTrendSeriesDto[],
  entityType: string,
  entityId: string,
): EntityTrendSeriesDto | undefined {
  const metricName = entityType === "Brand" ? "BrandMentionRate" : "MentionRate";
  return series.find((s) => s.entityId === entityId && s.metricName === metricName);
}
