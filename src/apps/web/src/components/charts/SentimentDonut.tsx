import { DonutChartWrapper, type DonutChartDatum } from "./DonutChartWrapper";
import { sentimentColors, sentimentOrder } from "./chartTheme";

interface SentimentDonutProps {
  /** Sentiment-value → count distribution. Keys: Positive | Neutral | Negative | Mixed | Unknown. */
  data: Record<string, number>;
  /** Optional fixed height (defaults to 240px). Width is fluid. */
  height?: number;
}

/**
 * Sentiment-distribution donut. Composes DonutChartWrapper with the
 * fixed sentiment-value color map (positive→green, negative→red, etc.).
 *
 * No business-logic calculation here — `sentimentSlices` carries the
 * pure shape transform so it can be unit-tested without dragging in
 * the chart renderer.
 */
export function SentimentDonut({ data, height = 240 }: SentimentDonutProps) {
  return <DonutChartWrapper data={sentimentSlices(data)} height={height} />;
}

/**
 * Builds the slice array fed to the donut: every observed (count > 0)
 * sentiment value, in canonical display order, with its fixed color.
 */
export function sentimentSlices(data: Record<string, number>): DonutChartDatum[] {
  return sentimentOrder
    .filter((value) => (data[value] ?? 0) > 0)
    .map((value) => ({
      id: value,
      label: value,
      value: data[value],
      color: sentimentColors[value],
    }));
}
