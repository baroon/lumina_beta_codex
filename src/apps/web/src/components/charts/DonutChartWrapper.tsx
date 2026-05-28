import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutChartDatum {
  /** Stable id for the slice (e.g. entity id). */
  id: string;
  /** Label shown in legend + tooltip. */
  label: string;
  /** Numeric value (slice size). */
  value: number;
  /** Slice color. Required — caller owns palette mapping for stability. */
  color: string;
}

interface DonutChartWrapperProps {
  data: DonutChartDatum[];
  /** Format the value displayed in tooltips. Defaults to integer rendering. */
  formatValue?: (value: number) => string;
  /** Inner radius as a fraction of the outer radius. Default 0.6 (donut hole). */
  innerRadius?: number;
  /** Fixed height (defaults to 240px). Width is fluid. */
  height?: number;
  /** Render an inline legend column on the right. Default true. */
  showLegend?: boolean;
}

/**
 * Generic donut chart wrapper built on Recharts, styled to match the
 * modern dashboard aesthetic: thin donut ring, soft slice borders, a
 * floating rounded tooltip, and an inline legend column on the right
 * with slice value + percent.
 *
 * Caller owns palette + ordering for stability across renders.
 */
export function DonutChartWrapper({
  data,
  formatValue,
  innerRadius = 0.6,
  height = 240,
  showLegend = true,
}: DonutChartWrapperProps) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, s) => sum + s.value, 0);
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div style={{ height }} className="flex w-full items-center gap-4 text-xs text-neutral-600">
      <div className="h-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                fontSize: 12,
                padding: "8px 10px",
              }}
              formatter={(value, name) => {
                const numeric = typeof value === "number" ? value : Number(value);
                return [fmt(numeric), name];
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={`${Math.round(innerRadius * 100)}%`}
              outerRadius="95%"
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
              paddingAngle={1}
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {showLegend && (
        <ul className="flex max-h-full min-w-[120px] flex-col gap-1.5 overflow-y-auto pr-2">
          {data.map((d) => {
            const share = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <li key={d.id} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-neutral-700" title={d.label}>
                  {d.label}
                </span>
                <span className="ml-auto shrink-0 text-neutral-500">{share}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
