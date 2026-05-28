import { ResponsiveLine } from "@nivo/line";
import { defaultBarColor, nivoTheme } from "./chartTheme";

export interface LineChartPoint {
  /** X-axis value (typically a timestamp ISO string). */
  x: string;
  /** Y-axis value (numeric). null marks a gap in the series. */
  y: number | null;
}

interface LineChartWrapperProps {
  data: LineChartPoint[];
  /** Override line color. Defaults to the primary brand color. */
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
 * Single-series line chart wrapper. Wraps Nivo's ResponsiveLine with Lumina
 * theming. Receives a prepared array of {x, y} — caller does the grouping
 * / sorting / formatting; the wrapper is dumb (ARCH-003 rule: charts must
 * not calculate business metrics).
 *
 * Null y-values render as gaps (nivo's <c>connectNulls={false}</c>), which
 * is what we want for trend points where the aggregator skipped a metric
 * (denominator-zero etc.) — missing data is visually distinct from a zero.
 */
export function LineChartWrapper({
  data,
  color = defaultBarColor,
  formatValue,
  formatX,
  height = 200,
  maxValue,
  minValue = 0,
  valueAxisLabel,
}: LineChartWrapperProps) {
  if (data.length === 0) return null;

  // Nivo line wants a series wrapper; we always render one series per chart.
  const series = [{ id: "value", data }];

  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={series}
        margin={{ top: 16, right: 24, bottom: 40, left: 52 }}
        xScale={{ type: "point" }}
        yScale={{
          type: "linear",
          min: minValue,
          max: maxValue ?? "auto",
          stacked: false,
        }}
        colors={[color]}
        lineWidth={2}
        pointSize={6}
        pointColor={color}
        pointBorderWidth={2}
        pointBorderColor={{ from: "color" }}
        enableArea
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
