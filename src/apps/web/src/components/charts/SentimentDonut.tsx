import { ResponsivePie } from "@nivo/pie";
import { nivoTheme, sentimentColors, sentimentOrder } from "./chartTheme";

interface SentimentDonutProps {
  /** Sentiment-value → count distribution. Keys: Positive | Neutral | Negative | Mixed | Unknown. */
  data: Record<string, number>;
  /** Optional fixed height (defaults to 240px). Width is fluid. */
  height?: number;
}

/**
 * Sentiment distribution donut. Wraps Nivo's ResponsivePie with Lumina
 * theming + a fixed sentiment-value color map (positive→green, negative→red,
 * etc.). Receives a prepared distribution dict — no business-logic
 * calculation here (ARCH-003 rule: charts receive view models).
 *
 * Unobserved sentiment values are excluded automatically (zero-count slices
 * would clutter the donut). When the entire distribution is empty the
 * wrapper renders nothing — caller decides whether to hide the section or
 * show an empty state.
 */
export function SentimentDonut({ data, height = 240 }: SentimentDonutProps) {
  const slices = sentimentOrder
    .filter((value) => (data[value] ?? 0) > 0)
    .map((value) => ({
      id: value,
      label: value,
      value: data[value],
      color: sentimentColors[value],
    }));

  if (slices.length === 0) return null;

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={slices}
        colors={({ data: slice }) => slice.color as string}
        innerRadius={0.6}
        padAngle={1}
        cornerRadius={2}
        margin={{ top: 12, right: 80, bottom: 12, left: 12 }}
        enableArcLabels={false}
        enableArcLinkLabels={false}
        theme={nivoTheme}
        legends={[
          {
            anchor: "right",
            direction: "column",
            translateX: 70,
            itemWidth: 70,
            itemHeight: 18,
            symbolSize: 10,
            symbolShape: "circle",
          },
        ]}
      />
    </div>
  );
}
