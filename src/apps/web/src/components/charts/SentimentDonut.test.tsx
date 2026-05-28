import { describe, it, expect } from "vitest";
import { sentimentSlices } from "./SentimentDonut";

/**
 * SentimentDonut is a thin composition over DonutChartWrapper —
 * mocking the chart renderer in tests is fiddly + brittle. The unit
 * value here is the slice-shape transform; cover that as a pure
 * function. Visual rendering belongs in Storybook.
 */
describe("sentimentSlices", () => {
  it("returns an empty list when the distribution is empty", () => {
    expect(sentimentSlices({})).toEqual([]);
  });

  it("filters out zero-count entries", () => {
    const result = sentimentSlices({ Positive: 6, Neutral: 0, Negative: 3 });
    expect(result.map((s) => `${s.id}:${s.value}`)).toEqual(["Positive:6", "Negative:3"]);
  });

  it("emits slices in canonical sentiment order regardless of input key order", () => {
    const result = sentimentSlices({
      Unknown: 1,
      Negative: 1,
      Positive: 1,
      Mixed: 1,
      Neutral: 1,
    });
    expect(result.map((s) => s.id)).toEqual([
      "Positive",
      "Neutral",
      "Mixed",
      "Negative",
      "Unknown",
    ]);
  });

  it("attaches the canonical sentiment color to each slice", () => {
    const result = sentimentSlices({ Positive: 1 });
    expect(result[0].color).toBeTruthy();
    expect(result[0].color.startsWith("#")).toBe(true);
  });
});
