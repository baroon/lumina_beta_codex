import tokens from "../../../../../design-tokens/tokens.json";

type ColorShade = Record<string, string>;
const palette = tokens.color as unknown as { primary: ColorShade; neutral: ColorShade };

export interface HeatmapCell {
  /** Row label this cell belongs to (Y axis). */
  row: string;
  /** Column label this cell belongs to (X axis). */
  col: string;
  /** Integer cell value. */
  value: number;
}

export interface HeatmapData {
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
}

interface HeatmapWrapperProps {
  data: HeatmapData;
  /** Optional formatter for tooltip / cell label. Defaults to integer. */
  formatValue?: (value: number) => string;
  /** Empty-cell text (cells absent from the sparse `cells` list). Default: "0". */
  missingValueLabel?: string;
  /** Render cell value inside the box. Default true. */
  showCellValues?: boolean;
  /** Optional override color ramp anchor. Defaults to primary-500. */
  rampColor?: string;
}

/**
 * Simple CSS-grid heatmap. Rows × cols matrix with intensity-mapped cells.
 *
 * Why a custom grid instead of `@nivo/heatmap`:
 *  - No new dependency. The shape is straightforward (rows + cols + sparse
 *    cells) and CSS Grid renders it directly.
 *  - Full Lumina styling control — color ramp anchored to the primary
 *    token and falls back to the neutral palette for empty cells.
 *  - Easier to test: a grid of `<div>`s with deterministic
 *    `data-row`/`data-col` attributes.
 *
 * Renders null when rows or cols is empty so callers can pass raw
 * payloads without a length check.
 */
export function HeatmapWrapper({
  data,
  formatValue,
  missingValueLabel = "0",
  showCellValues = true,
  rampColor = palette.primary["500"],
}: HeatmapWrapperProps) {
  if (data.rows.length === 0 || data.cols.length === 0) return null;

  const lookup = new Map<string, number>();
  let max = 0;
  for (const cell of data.cells) {
    lookup.set(`${cell.row}__${cell.col}`, cell.value);
    if (cell.value > max) max = cell.value;
  }

  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div className="overflow-x-auto" data-testid="heatmap">
      <div
        className="inline-grid gap-1"
        style={{
          gridTemplateColumns: `auto repeat(${data.cols.length}, minmax(48px, 1fr))`,
        }}
      >
        {/* Top-left empty corner */}
        <div aria-hidden />
        {/* Column headers */}
        {data.cols.map((col) => (
          <div
            key={`col-${col}`}
            className="text-center text-xs text-neutral-500 py-1 truncate"
            title={col}
          >
            {col}
          </div>
        ))}

        {/* Rows */}
        {data.rows.map((row) => (
          <Row
            key={`row-${row}`}
            row={row}
            cols={data.cols}
            lookup={lookup}
            max={max}
            rampColor={rampColor}
            fmt={fmt}
            missingValueLabel={missingValueLabel}
            showCellValues={showCellValues}
          />
        ))}
      </div>
    </div>
  );
}

interface RowProps {
  row: string;
  cols: string[];
  lookup: Map<string, number>;
  max: number;
  rampColor: string;
  fmt: (v: number) => string;
  missingValueLabel: string;
  showCellValues: boolean;
}

function Row({
  row,
  cols,
  lookup,
  max,
  rampColor,
  fmt,
  missingValueLabel,
  showCellValues,
}: RowProps) {
  return (
    <>
      <div
        className="text-right text-xs text-neutral-700 pr-2 py-1 truncate self-center"
        title={row}
      >
        {row}
      </div>
      {cols.map((col) => {
        const raw = lookup.get(`${row}__${col}`);
        const value = raw ?? 0;
        const intensity = max > 0 ? value / max : 0;
        const bg = value === 0 ? palette.neutral["100"] : applyAlpha(rampColor, intensity);
        const fg = intensity > 0.6 ? "#fff" : palette.neutral["700"];
        return (
          <div
            key={`cell-${row}__${col}`}
            data-row={row}
            data-col={col}
            data-value={value}
            className="rounded-sm flex items-center justify-center text-xs font-medium h-8"
            style={{ backgroundColor: bg, color: fg }}
            title={`${row} • ${col}: ${fmt(value)}`}
          >
            {showCellValues ? (value === 0 ? missingValueLabel : fmt(value)) : null}
          </div>
        );
      })}
    </>
  );
}

/**
 * Mix a hex color toward neutral-50 by (1 - alpha). Pure CSS rgba would
 * leak the background through the cell when the page is on a dark
 * surface — pre-mixing keeps the cell opaque.
 */
function applyAlpha(hex: string, alpha: number): string {
  const a = Math.max(0.15, alpha); // floor: even the smallest non-zero cell is visible
  const { r, g, b } = hexToRgb(hex);
  const r2 = Math.round(r * a + 255 * (1 - a));
  const g2 = Math.round(g * a + 255 * (1 - a));
  const b2 = Math.round(b * a + 255 * (1 - a));
  return `rgb(${r2}, ${g2}, ${b2})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}
