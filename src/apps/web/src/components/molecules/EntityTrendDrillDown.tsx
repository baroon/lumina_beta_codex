import { LineChartWrapper } from "@/components/charts/LineChartWrapper";
import type { EntityTrendSeriesDto } from "@/types/api";

/**
 * Inline drill-down panel for one entity in a ranking-style table.
 * Renders the per-scan trend (BrandMentionRate for tracked brands,
 * MentionRate for competitors) from the workspace overview's series
 * data. Used on both the Insights ranking table and the per-tracker
 * hub's TopEntities card so the click-to-expand behavior reads the
 * same on either surface.
 *
 * Falls back to a soft hint when the entity has no numeric points
 * (single scan, all nulls, or the series is missing) rather than
 * rendering an empty chart.
 */
export function EntityTrendDrillDown({
  name,
  trend,
}: {
  name: string;
  trend: EntityTrendSeriesDto | undefined;
}) {
  const points = (trend?.points ?? []).filter((p) => p.value != null);
  if (points.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        Not enough per-scan data to plot {name}'s trend in this window.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">
        Visibility per scan — {name}
      </p>
      <LineChartWrapper
        data={points.map((p) => ({ x: p.capturedAt, y: p.value }))}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        formatX={(iso) => {
          try {
            return new Date(iso).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
          } catch {
            return iso;
          }
        }}
        height={160}
      />
    </div>
  );
}
