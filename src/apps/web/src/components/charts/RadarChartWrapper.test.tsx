import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RadarChartWrapper, type RadarChartDatum } from "./RadarChartWrapper";

vi.mock("@nivo/radar", () => ({
  ResponsiveRadar: ({ data }: { data: Array<{ axis: string; value: number }> }) => (
    <div data-testid="radar-chart">
      {data.map((d) => (
        <span key={d.axis}>
          {d.axis}={d.value}
        </span>
      ))}
    </div>
  ),
}));

const data: RadarChartDatum[] = [
  { axis: "Nostri", value: 96 },
  { axis: "Gensler", value: 42 },
  { axis: "HOK", value: 34 },
];

describe("RadarChartWrapper", () => {
  it("renders one axis per datum", () => {
    const { getByTestId } = render(<RadarChartWrapper data={data} />);
    const chart = getByTestId("radar-chart");
    expect(chart).toHaveTextContent("Nostri=96");
    expect(chart).toHaveTextContent("Gensler=42");
    expect(chart).toHaveTextContent("HOK=34");
  });

  it("renders nothing when data has fewer than 3 axes", () => {
    // Radar polygon needs >= 3 vertices; below that the chart degenerates.
    const { queryByTestId } = render(<RadarChartWrapper data={data.slice(0, 2)} />);
    expect(queryByTestId("radar-chart")).not.toBeInTheDocument();
  });
});
