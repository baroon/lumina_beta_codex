import { ResponsiveLine } from "@nivo/line";
import { defaultBarColor, nivoTheme } from "./chartTheme";

export interface LineChartPoint {
  /** X-axis value (typically a timestamp ISO string). */
  x: string;
  /** Y-axis value (numeric). null marks a gap in the series. */
  y: number | null;
}

/**
 * One series in a multi-line chart. Caller assigns the id + display name
 * (shown in legend + tooltip) and optional color override. When the chart
 * is rendering many series, prefer stable per-entity color mapping over
 * automatic palettes so the same entity reads as the same color across
 * renders.
 */
export interface LineChartSeries {
  id: string;
  name: string;
  color?: string;
  data: LineChartPoint[];
}

interface LineChartWrapperProps {
  /**
   * Single-series mode (the v1 shape). Pass an array of points; the wrapper
   * wraps them in a one-element series internally and draws the line with
   * <c>color</c>.
   */
  data?: LineChartPoint[];
  /**
   * Multi-series mode (Phase 4 v2). Pass an array of {id, name, data}
   * series; the wrapper draws one line per series + legend. <c>color</c>
   * prop is ignored — each series provides its own.
   */
  series?: LineChartSeries[];
  /** Single-series mode only. Defaults to the primary brand color. */
  color?: string;
  /** Format the value displayed in tooltips / Y-axis. Defaults to numeric rendering. */
  formatValue?: (value: number) => string;
  /** Format the X-axis tick. Defaults to passing through the raw string. */
  formatX?: (raw: string) => string;
  /** Fixed height. Default 200px. Width fills the parent. */
  height?: number;
  /** Force the Y-axis max — useful for rate-shaped series locked to [0, 1]. */
  maxValue?: number;
  /** Force the Y-axis min. Default 0. */
  minValue?: number;
  /** Optional axis label on the Y axis. */
  valueAxisLabel?: string;
}

/**
 * Line chart wrapper. Wraps Nivo's ResponsiveLine with Lumina theming.
 * Two modes:
 * - Single-series: pass <c>data</c> as a point array. One line drawn in
 *   <c>color</c>. No legend.
 * - Multi-series (Phase 4 v2): pass <c>series</c> as an array of named
 *   series. One line per series in its own color, with legend.
 *
 * Callers prepare data shape; wrapper is dumb (ARCH-003 rule: charts
 * must not calculate business metrics). Null y-values render as gaps so
 * missing-data is visually distinct from a real zero.
 */
export function LineChartWrapper({
  data,
  series,
  color = defaultBarColor,
  formatValue,
  formatX,
  height = 200,
  maxValue,
  minValue = 0,
  valueAxisLabel,
}: LineChartWrapperProps) {
  // Normalize to nivo's series shape. Single-series mode wraps the bare
  // point array; multi-series mode keeps the caller's array as-is.
  const nivoSeries =
    series && series.length > 0
      ? series.map((s) => ({ id: s.id, name: s.name, data: s.data }))
      : data && data.length > 0
        ? [{ id: "value", name: "value", data }]
        : [];

  if (nivoSeries.length === 0) return null;

  const isMulti = !!series && series.length > 0;
  const colors = isMulti
    ? series.map((s, i) => s.color ?? fallbackPalette[i % fallbackPalette.length])
    : [color];

  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={nivoSeries}
        margin={{
          top: 16,
          right: 24,
          bottom: isMulti ? 64 : 40, // extra room for the legend below
          left: 52,
        }}
        xScale={{ type: "point" }}
        yScale={{
          type: "linear",
          min: minValue,
          max: maxValue ?? "auto",
          stacked: false,
        }}
        colors={colors}
        lineWidth={2}
        pointSize={isMulti ? 5 : 6}
        pointColor={{ from: "color" }}
        pointBorderWidth={1.5}
        pointBorderColor={{ from: "color", modifiers: [["brighter", 0.5]] }}
        enableArea={!isMulti}
        areaOpacity={0.08}
        enableGridX={false}
        gridYValues={5}
        axisBottom={{
          tickSize: 4,
          tickPadding: 8,
          tickRotation: -25,
          format: formatX,
        }}
        axisLeft={{
          tickSize: 4,
          tickPadding: 6,
          tickValues: 5,
          format: formatValue,
          legend: valueAxisLabel,
          legendOffset: -44,
          legendPosition: "middle",
        }}
        animate={false}
        useMesh
        legends={
          isMulti
            ? [
                {
                  anchor: "bottom",
                  direction: "row",
                  translateY: 50,
                  itemsSpacing: 8,
                  itemDirection: "left-to-right",
                  itemWidth: 96,
                  itemHeight: 16,
                  itemTextColor: "#525252",
                  symbolShape: "circle",
                  symbolSize: 8,
                },
              ]
            : undefined
        }
        tooltip={({ point }) => (
          <div
            style={{
              background: "white",
              padding: "6px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              fontSize: 12,
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            {isMulti && (
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {(point.serieId as string) ?? ""}
              </div>
            )}
            <div>{formatX ? formatX(point.data.xFormatted as string) : point.data.xFormatted}</div>
            <div style={{ fontWeight: 600 }}>
              {formatValue ? formatValue(point.data.y as number) : point.data.yFormatted}
            </div>
          </div>
        )}
        theme={nivoTheme}
      />
    </div>
  );
}

/**
 * Stable fallback palette when a series doesn't provide its own color.
 * Six colors — enough for the dashboard's typical entity count (brand +
 * up to 5 tracked competitors). Beyond six, series cycle through the
 * palette.
 */
const fallbackPalette = [
  "#6366f1", // primary-500
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#a855f7", // purple
];
