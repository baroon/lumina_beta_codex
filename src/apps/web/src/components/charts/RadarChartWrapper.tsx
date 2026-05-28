import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { defaultBarColor } from "./chartTheme";

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
 * Single-series radar / spider chart wrapper built on Recharts (Tremor
 * does not ship a radar). Receives a prepared array of {axis, value} —
 * caller does the grouping / sorting / formatting; the wrapper is dumb
 * (ARCH-003 rule: charts must not calculate business metrics).
 *
 * Renders nothing when data has fewer than 3 axes; a radar polygon
 * needs ≥3 vertices to be meaningful.
 */
export function RadarChartWrapper({
  data,
  color = defaultBarColor,
  formatValue,
  height = 280,
  maxValue,
}: RadarChartWrapperProps) {
  if (data.length < 3) return null;

  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div style={{ height }} className="w-full text-xs text-neutral-600">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fill: "#525252" }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxValue ?? "auto"]}
            tick={{ fontSize: 10, fill: "#a3a3a3" }}
            tickFormatter={fmt}
            axisLine={false}
            tickCount={4}
          />
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontSize: 12,
              padding: "8px 10px",
            }}
            formatter={(value) => {
              const numeric = typeof value === "number" ? value : Number(value);
              return [fmt(numeric), ""];
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Radar
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.18}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
