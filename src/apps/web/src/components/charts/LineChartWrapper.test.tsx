import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LineChartWrapper, type LineChartPoint } from "./LineChartWrapper";

// nivo + jsdom flake — stub the line module same way the other chart tests do.
vi.mock("@nivo/line", () => ({
  ResponsiveLine: ({ data }: { data: Array<{ data: LineChartPoint[] }> }) => (
    <div data-testid="line-chart">
      {data[0].data.map((p, i) => (
        <span key={i}>
          {p.x}={p.y ?? "null"}
        </span>
      ))}
    </div>
  ),
}));

describe("LineChartWrapper", () => {
  it("renders one point per datum", () => {
    const data: LineChartPoint[] = [
      { x: "Apr 28", y: 0.25 },
      { x: "May 21", y: 0.38 },
    ];
    const { getByTestId } = render(<LineChartWrapper data={data} />);
    const chart = getByTestId("line-chart");
    expect(chart).toHaveTextContent("Apr 28=0.25");
    expect(chart).toHaveTextContent("May 21=0.38");
  });

  it("preserves null y-values (renders as gaps)", () => {
    const data: LineChartPoint[] = [
      { x: "Apr 28", y: 0.25 },
      { x: "May 3", y: null },
      { x: "May 8", y: 0.3 },
    ];
    const { getByTestId } = render(<LineChartWrapper data={data} />);
    expect(getByTestId("line-chart")).toHaveTextContent("May 3=null");
  });

  it("renders nothing when data is empty", () => {
    const { queryByTestId } = render(<LineChartWrapper data={[]} />);
    expect(queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});
