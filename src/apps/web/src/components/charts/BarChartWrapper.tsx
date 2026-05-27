import { ResponsiveBar } from "@nivo/bar";
import { defaultBarColor, nivoTheme } from "./chartTheme";

export interface BarChartDatum {
  /** Category label (y-axis for horizontal, x-axis for vertical). */
  label: string;
  /** Numeric value (length of the bar). */
  value: number;
}

interface BarChartWrapperProps {
  data: BarChartDatum[];
  /** Default "horizontal" — most reporting bars are horizontal lists. */
  layout?: "horizontal" | "vertical";
  /** Override bar color. Defaults to the primary brand color. */
  color?: string;
  /** Format the value displayed in tooltips / labels. Defaults to integer rendering. */
  formatValue?: (value: number) => string;
  /** Optional axis label on the value axis. */
  valueAxisLabel?: string;
  /** Fixed height. Default 240px. Width fills the parent. */
  height?: number;
  /** Force the value-axis max (useful when comparing rates that should share a [0, 1] scale). */
  maxValue?: number;
}

/**
 * Single-series bar chart wrapper. Wraps Nivo's ResponsiveBar with Lumina
 * theming. Receives a prepared array of {label, value} — caller does the
 * grouping / sorting / formatting; the wrapper is dumb (ARCH-003 rule:
 * charts must not calculate business metrics).
 *
 * Renders nothing when data is empty so callers can hand off raw arrays
 * without an enclosing length check.
 */
export function BarChartWrapper({
  data,
  layout = "horizontal",
  color = defaultBarColor,
  formatValue,
  valueAxisLabel,
  height = 240,
  maxValue,
}: BarChartWrapperProps) {
  if (data.length === 0) return null;

  return (
    <div style={{ height }}>
      <ResponsiveBar
        data={data as unknown as readonly Record<string, string | number>[]}
        keys={["value"]}
        indexBy="label"
        layout={layout}
        margin={
          layout === "horizontal"
            ? { top: 8, right: 24, bottom: 36, left: 140 }
            : { top: 8, right: 16, bottom: 60, left: 48 }
        }
        padding={0.28}
        colors={() => color}
        borderRadius={2}
        valueFormat={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
        labelTextColor="#FFFFFF"
        maxValue={maxValue}
        axisBottom={
          layout === "horizontal"
            ? { tickSize: 4, tickPadding: 6, legend: valueAxisLabel, legendOffset: 28 }
            : { tickSize: 4, tickPadding: 6, tickRotation: -25 }
        }
        axisLeft={
          layout === "horizontal"
            ? { tickSize: 4, tickPadding: 6 }
            : { tickSize: 4, tickPadding: 6, legend: valueAxisLabel, legendOffset: -36 }
        }
        gridXValues={layout === "horizontal" ? 5 : undefined}
        gridYValues={layout === "vertical" ? 5 : undefined}
        enableLabel
        animate={false}
        theme={nivoTheme}
      />
    </div>
  );
}
