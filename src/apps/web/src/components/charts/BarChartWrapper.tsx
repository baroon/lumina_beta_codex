import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { defaultBarColor } from "./chartTheme";

export interface BarChartDatum {
  /** Category label (Y-axis for horizontal, X-axis for vertical). */
  label: string;
  /** Numeric value (length of the bar). */
  value: number;
  /** Optional per-bar color override. Defaults to `color` prop. */
  color?: string;
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
 * Single-series bar chart wrapper built on Recharts, styled to match
 * the modern dashboard aesthetic: dashed gridlines, no axis lines,
 * pill-shaped bars with their value rendered at the bar tip.
 *
 * Caller does the grouping / sorting / formatting; wrapper is dumb
 * (ARCH-003 rule: charts must not calculate business metrics). Renders
 * nothing when data is empty.
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

  const horizontal = layout === "horizontal";

  // Recharts terminology: layout="vertical" means bars run horizontally
  // (left → right). layout="horizontal" means bars run vertically
  // (bottom → top). Our prop names are from the user's perspective —
  // remap once here.
  const rechartsLayout = horizontal ? "vertical" : "horizontal";

  const valueDomain: [number | string, number | string] = [0, maxValue ?? "auto"];
  const tickFormat = formatValue ?? ((v: number) => String(v));

  return (
    <div style={{ height }} className="w-full text-xs text-neutral-600">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={rechartsLayout}
          margin={{ top: 8, right: horizontal ? 48 : 16, bottom: 16, left: horizontal ? 0 : 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={!horizontal}
            vertical={horizontal}
            stroke="#e5e7eb"
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                domain={valueDomain}
                tickFormatter={tickFormat}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#737373" }}
                label={
                  valueAxisLabel
                    ? {
                        value: valueAxisLabel,
                        position: "insideBottom",
                        offset: -4,
                        style: { fontSize: 11, fill: "#737373" },
                      }
                    : undefined
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#525252" }}
                width={120}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#525252" }}
                angle={-25}
                textAnchor="end"
                interval={0}
                height={48}
              />
              <YAxis
                type="number"
                domain={valueDomain}
                tickFormatter={tickFormat}
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
            </>
          )}
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
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
              return [tickFormat(numeric), valueAxisLabel ?? "Value"];
            }}
          />
          <Bar dataKey="value" radius={[3, 3, 3, 3]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? color} />
            ))}
            <LabelList
              dataKey="value"
              position={horizontal ? "right" : "top"}
              formatter={(v) => {
                const numeric = typeof v === "number" ? v : Number(v);
                return Number.isFinite(numeric) ? tickFormat(numeric) : "";
              }}
              style={{ fontSize: 11, fill: "#525252" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
