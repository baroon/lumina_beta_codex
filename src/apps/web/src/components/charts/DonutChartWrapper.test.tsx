import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DonutChartWrapper, type DonutChartDatum } from "./DonutChartWrapper";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="donut-chart">{children}</div>
    ),
    Pie: ({ data }: { data: DonutChartDatum[] }) => (
      <span data-testid="pie">
        {data.map((d) => (
          <span key={d.id}>
            {d.label}={d.value}
          </span>
        ))}
      </span>
    ),
    Cell: () => null,
    Tooltip: () => null,
  };
});

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

  it("renders an inline legend with per-slice percent shares", () => {
    const { getByText } = render(<DonutChartWrapper data={data} />);
    // 60/(60+40) → 60%; 40/(60+40) → 40%.
    expect(getByText("60%")).toBeInTheDocument();
    expect(getByText("40%")).toBeInTheDocument();
  });
});
