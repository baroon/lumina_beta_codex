import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { defaultBarColor } from "./chartTheme";

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
   * Single-series mode. Pass an array of points; the wrapper wraps them
   * in a one-element series internally and draws the line with `color`.
   */
  data?: LineChartPoint[];
  /**
   * Multi-series mode. Pass an array of {id, name, data} series; the
   * wrapper draws one line per series + legend.
   */
  series?: LineChartSeries[];
  /** Single-series mode only. Defaults to the primary brand color. */
  color?: string;
  /** Format the value displayed in tooltips / Y-axis. */
  formatValue?: (value: number) => string;
  /** Format the X-axis tick. Default: identity. */
  formatX?: (raw: string) => string;
  /** Fixed height. Default 224px (28 * 8 = h-56). */
  height?: number;
  /** Force the Y-axis max. */
  maxValue?: number;
  /** Force the Y-axis min. Default 0. */
  minValue?: number;
  /** Optional axis label on the Y axis. */
  valueAxisLabel?: string;
  /**
   * When true, flips the Y axis so the smaller value sits at the top.
   * Useful for rank-shaped series (rank 1 is the best result; viewers
   * expect "up = better").
   */
  reverseY?: boolean;
}

/**
 * Line chart wrapper built on Recharts (the same engine Tremor uses),
 * styled to match Tremor's modern dashboard aesthetic: dashed horizontal
 * gridlines, monotone curves, soft point dots, minimal axis lines, and a
 * floating rounded tooltip with the series + value.
 *
 * Null y values render as gaps so missing data is visually distinct from
 * a real zero.
 */
export function LineChartWrapper({
  data,
  series,
  color = defaultBarColor,
  formatValue,
  formatX,
  height = 224,
  maxValue,
  minValue = 0,
  valueAxisLabel,
  reverseY = false,
}: LineChartWrapperProps) {
  const isMulti = !!series && series.length > 0;

  // Collapse all series into a single { x, "<seriesName>": value }[] —
  // Recharts wants one row per X tick with each series as a named field.
  const { rows, categories, colors } = useMemo(() => {
    if (isMulti) {
      const allXs = new Set<string>();
      for (const s of series!) for (const p of s.data) allXs.add(p.x);
      const sortedXs = Array.from(allXs).sort();

      const cats = series!.map((s) => s.name);
      const cols = series!.map((s, i) => s.color ?? fallbackPalette[i % fallbackPalette.length]);

      const lookup = new Map<string, Record<string, number | null>>();
      for (const s of series!) {
        for (const p of s.data) {
          const row = lookup.get(p.x) ?? {};
          row[s.name] = p.y;
          lookup.set(p.x, row);
        }
      }
      const builtRows = sortedXs.map((x) => ({ x, ...(lookup.get(x) ?? {}) }));
      return { rows: builtRows, categories: cats, colors: cols };
    }
    if (data && data.length > 0) {
      return {
        rows: data.map((p) => ({ x: p.x, value: p.y })),
        categories: ["value"],
        colors: [color],
      };
    }
    return { rows: [], categories: [], colors: [] };
  }, [data, series, color, isMulti]);

  if (rows.length === 0) return null;

  return (
    <div style={{ height }} className="w-full text-xs text-neutral-600">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="x"
            tickFormatter={formatX}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#737373" }}
            dy={4}
          />
          <YAxis
            reversed={reverseY}
            domain={[minValue, maxValue ?? "auto"]}
            tickFormatter={formatValue}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#737373" }}
            width={48}
            label={
              valueAxisLabel
                ? {
                    value: valueAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11, fill: "#737373", textAnchor: "middle" },
                  }
                : undefined
            }
          />
          <Tooltip
            cursor={{ stroke: "#a3a3a3", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontSize: 12,
              padding: "8px 10px",
            }}
            labelFormatter={(label) => (formatX ? formatX(label as string) : label)}
            formatter={(value, name) => {
              const numeric = typeof value === "number" ? value : Number(value);
              return [formatValue ? formatValue(numeric) : numeric, name];
            }}
          />
          {isMulti && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
          )}
          {categories.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={colors[i]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[i], strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Stable fallback palette when a series doesn't provide its own color.
 * Six colors — enough for the dashboard's typical entity count (brand +
 * up to 5 tracked competitors). Beyond six, series cycle.
 */
const fallbackPalette = [
  "#6366f1", // primary-500
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#a855f7", // purple
];
