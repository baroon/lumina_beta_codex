import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DonutChartWrapper, type DonutChartDatum } from "./DonutChartWrapper";

vi.mock("@nivo/pie", () => ({
  ResponsivePie: ({ data }: { data: DonutChartDatum[] }) => (
    <div data-testid="donut-chart">
      {data.map((d) => (
        <span key={d.id}>
          {d.label}={d.value}
        </span>
      ))}
    </div>
  ),
}));

const data: DonutChartDatum[] = [
  { id: "a", label: "A", value: 60, color: "#111" },
  { id: "b", label: "B", value: 40, color: "#222" },
];

describe("DonutChartWrapper", () => {
  it("renders one slice per datum", () => {
    const { getByTestId } = render(<DonutChartWrapper data={data} />);
    const chart = getByTestId("donut-chart");
    expect(chart).toHaveTextContent("A=60");
    expect(chart).toHaveTextContent("B=40");
  });

  it("renders nothing when data is empty", () => {
    const { queryByTestId } = render(<DonutChartWrapper data={[]} />);
    expect(queryByTestId("donut-chart")).not.toBeInTheDocument();
  });
});
