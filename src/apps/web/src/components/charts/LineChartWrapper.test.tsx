import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LineChartWrapper, type LineChartPoint } from "./LineChartWrapper";

// Recharts ResponsiveContainer reads the parent's actual pixel size from
// the DOM, which jsdom does not implement. Stub the LineChart from
// recharts and dump the data + non-null points into a testid div so we
// can assert on the prepared shape.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({
      data,
      children,
    }: {
      data: Array<{ x: string; value?: number | null }>;
      children: React.ReactNode;
    }) => (
      <div data-testid="line-chart">
        {data.map((row, i) => (
          <span key={i}>
            {row.x}={row.value === undefined ? "null" : (row.value ?? "null")}
          </span>
        ))}
        {children}
      </div>
    ),
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

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
