import { ResponsiveRadar } from "@nivo/radar";
import { defaultBarColor, nivoTheme } from "./chartTheme";

export interface RadarChartDatum {
  /** Category label (one axis per datum). */
  axis: string;
  /** Numeric value (axis radius). */
  value: number;
}

interface RadarChartWrapperProps {
  data: RadarChartDatum[];
  /** Series color. Defaults to the primary brand color. */
  color?: string;
  /** Format the value displayed in tooltips. Defaults to integer rendering. */
  formatValue?: (value: number) => string;
  /** Fixed height. Default 280px. Width fills the parent. */
  height?: number;
  /** Force the axis max — useful when comparing radars of the same scale. */
  maxValue?: number;
}

/**
 * Single-series radar/spider chart wrapper. Wraps Nivo's ResponsiveRadar
 * with Lumina theming. Receives a prepared array of {axis, value} — caller
 * does the grouping / sorting / formatting; the wrapper is dumb
 * (ARCH-003 rule: charts must not calculate business metrics).
 *
 * Renders nothing when data has fewer than 3 axes (nivo radar needs ≥3 to
 * draw a polygon). Callers should hide the section in that case.
 */
export function RadarChartWrapper({
  data,
  color = defaultBarColor,
  formatValue,
  height = 280,
  maxValue,
}: RadarChartWrapperProps) {
  if (data.length < 3) return null;

  return (
    <div style={{ height }}>
      <ResponsiveRadar
        data={data as unknown as Record<string, string | number>[]}
        keys={["value"]}
        indexBy="axis"
        valueFormat={(v) => (formatValue ? formatValue(v) : String(v))}
        maxValue={maxValue}
        margin={{ top: 32, right: 80, bottom: 32, left: 80 }}
        gridLabelOffset={16}
        dotSize={6}
        dotColor={color}
        dotBorderWidth={2}
        dotBorderColor={{ from: "color", modifiers: [["brighter", 0.5]] }}
        colors={[color]}
        fillOpacity={0.18}
        borderColor={color}
        borderWidth={2}
        gridShape="circular"
        animate={false}
        theme={nivoTheme}
      />
    </div>
  );
}
