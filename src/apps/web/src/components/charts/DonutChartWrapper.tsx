import { ResponsivePie } from "@nivo/pie";
import { nivoTheme } from "./chartTheme";

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
  /** Render a legend column on the right. Default true. */
  showLegend?: boolean;
}

/**
 * Generic donut chart wrapper. Wraps Nivo's ResponsivePie with Lumina
 * theming. Receives a prepared array of {id, label, value, color} — caller
 * owns palette + ordering for stability across renders (e.g. tracked-brand
 * always at primary color, competitors stable across reloads).
 *
 * SentimentDonut is the sentiment-specific specialization with a fixed
 * sentiment-value color map. Reuse this wrapper for share-of-voice,
 * domain-types, etc.
 */
export function DonutChartWrapper({
  data,
  formatValue,
  innerRadius = 0.6,
  height = 240,
  showLegend = true,
}: DonutChartWrapperProps) {
  if (data.length === 0) return null;

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={data}
        colors={({ data: slice }) => slice.color as string}
        valueFormat={(v) => (formatValue ? formatValue(v) : String(v))}
        innerRadius={innerRadius}
        padAngle={1}
        cornerRadius={2}
        margin={{ top: 12, right: showLegend ? 120 : 12, bottom: 12, left: 12 }}
        enableArcLabels={false}
        enableArcLinkLabels={false}
        theme={nivoTheme}
        legends={
          showLegend
            ? [
                {
                  anchor: "right",
                  direction: "column",
                  translateX: 100,
                  itemWidth: 90,
                  itemHeight: 18,
                  symbolSize: 10,
                  symbolShape: "circle",
                },
              ]
            : undefined
        }
      />
    </div>
  );
}
