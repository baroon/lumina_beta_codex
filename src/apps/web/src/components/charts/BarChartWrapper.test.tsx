import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Recharts ResponsiveContainer reads the parent's actual pixel size from
// the DOM, which jsdom doesn't implement. Stub it + the children so we
// can assert on the data + layout props the wrapper threads through.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    BarChart: ({
      data,
      layout,
      children,
    }: {
      data: Array<{ label: string; value: number }>;
      layout: string;
      children: React.ReactNode;
    }) => (
      <div
        data-testid="bar"
        data-layout={layout}
        data-labels={data.map((d) => d.label).join("|")}
        data-values={data.map((d) => d.value).join("|")}
      >
        {children}
      </div>
    ),
    Bar: () => null,
    Cell: () => null,
    LabelList: () => null,
    XAxis: ({ domain }: { domain?: [number | string, number | string] }) => (
      <span data-testid="x-axis" data-domain={domain ? domain.join(",") : ""} />
    ),
    YAxis: ({ domain }: { domain?: [number | string, number | string] }) => (
      <span data-testid="y-axis" data-domain={domain ? domain.join(",") : ""} />
    ),
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

import { BarChartWrapper } from "./BarChartWrapper";

const DATA = [
  { label: "A", value: 3 },
  { label: "B", value: 5 },
];

describe("BarChartWrapper", () => {
  it("renders nothing when data is empty", () => {
    const { container } = render(<BarChartWrapper data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("passes the data array through unchanged", () => {
    const { getByTestId } = render(<BarChartWrapper data={DATA} />);
    const bar = getByTestId("bar");
    expect(bar.getAttribute("data-labels")).toBe("A|B");
    expect(bar.getAttribute("data-values")).toBe("3|5");
  });

  it("default horizontal layout maps to Recharts layout='vertical'", () => {
    // Recharts inverts the semantic ("vertical" means bars run horizontally
    // — left → right). The wrapper handles the remap; we just verify here.
    const { getByTestId } = render(<BarChartWrapper data={DATA} />);
    expect(getByTestId("bar").getAttribute("data-layout")).toBe("vertical");
  });

  it("layout='vertical' maps to Recharts layout='horizontal'", () => {
    const { getByTestId } = render(<BarChartWrapper data={DATA} layout="vertical" />);
    expect(getByTestId("bar").getAttribute("data-layout")).toBe("horizontal");
  });

  it("threads maxValue through to the value axis (used to pin rate charts to [0, 1])", () => {
    const { getByTestId } = render(<BarChartWrapper data={DATA} maxValue={1} />);
    // Horizontal layout → value axis is the X axis.
    expect(getByTestId("x-axis").getAttribute("data-domain")).toBe("0,1");
  });

  it("threads maxValue through to the Y axis when layout is vertical", () => {
    const { getByTestId } = render(<BarChartWrapper data={DATA} layout="vertical" maxValue={1} />);
    expect(getByTestId("y-axis").getAttribute("data-domain")).toBe("0,1");
  });
});
