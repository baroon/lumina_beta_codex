import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Nivo's ResponsivePie measures its container via ResizeObserver, which
// jsdom doesn't ship. Stub it to a minimal component that just renders a
// data-* attribute we can assert on. The wrapper's contract — that it
// passes a derived `data` array of slices in display order — is what we
// actually test; rendering the actual SVG is a Storybook concern.
vi.mock("@nivo/pie", () => ({
  ResponsivePie: ({ data }: { data: Array<{ id: string; value: number }> }) => (
    <div data-testid="pie" data-ids={data.map((d) => `${d.id}:${d.value}`).join(",")} />
  ),
}));

import { SentimentDonut } from "./SentimentDonut";

describe("SentimentDonut", () => {
  it("renders nothing when distribution is empty", () => {
    const { container } = render(<SentimentDonut data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders only observed sentiment values", () => {
    const { getByTestId } = render(<SentimentDonut data={{ Positive: 6, Unknown: 20 }} />);
    const ids = getByTestId("pie").getAttribute("data-ids");
    expect(ids).toBe("Positive:6,Unknown:20");
  });

  it("filters out zero-count entries", () => {
    const { getByTestId } = render(
      <SentimentDonut data={{ Positive: 6, Neutral: 0, Negative: 3 }} />,
    );
    expect(getByTestId("pie").getAttribute("data-ids")).toBe("Positive:6,Negative:3");
  });

  it("emits slices in canonical sentiment order (Positive, Neutral, Mixed, Negative, Unknown)", () => {
    // Caller passes in arbitrary key order — wrapper enforces the display
    // ordering so the legend doesn't shuffle across scans.
    const { getByTestId } = render(
      <SentimentDonut data={{ Unknown: 1, Negative: 1, Positive: 1, Mixed: 1, Neutral: 1 }} />,
    );
    expect(getByTestId("pie").getAttribute("data-ids")).toBe(
      "Positive:1,Neutral:1,Mixed:1,Negative:1,Unknown:1",
    );
  });
});
